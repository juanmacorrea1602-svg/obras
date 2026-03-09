"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Upload, Camera, AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { extractInvoiceData } from '@/ai/flows/invoice-data-extraction';
import { anomalyExplanation, type AnomalyExplanationOutput } from '@/ai/flows/anomaly-explanation';
import { cn } from '@/lib/utils';

export default function NewExpensePage() {
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);
  
  // States
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [itemAlert, setItemAlert] = useState<AnomalyExplanationOutput | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Firestore Queries
  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'projects'), where('responsibleAnalystId', '==', user.uid));
  }, [user, firestore]);

  const budgetItemsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return collection(firestore, `projects/${selectedProjectId}/budgetItems`);
  }, [firestore, selectedProjectId]);

  const stagesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return collection(firestore, `projects/${selectedProjectId}/stages`);
  }, [firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: budgetItems, isLoading: budgetLoading } = useCollection(budgetItemsQuery);
  const { data: stages } = useCollection(stagesQuery);

  if (!mounted) return null;

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingOCR(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUri = event.target?.result as string;
      try {
        const result = await extractInvoiceData({ invoiceImageDataUri: dataUri });
        toast({
          title: "Datos Extraídos por IA",
          description: `Proveedor: ${result.providerName} detectado. Monto: $${result.totalAmount}`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error OCR",
          description: "No se pudo procesar la imagen del comprobante.",
        });
      } finally {
        setLoadingOCR(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleItemChange = async (val: string) => {
    setSelectedItemId(val);
    const item = budgetItems?.find(i => i.id === val);
    if (!item || !selectedProject) return;

    setIsAnalyzing(true);
    setItemAlert(null);

    const stage = stages?.find(s => s.id === item.stageId);
    const stageName = stage?.name || 'Otros';

    try {
      const analysis = await anomalyExplanation({
        projectName: selectedProject.name,
        itemId: item.id,
        itemName: item.name,
        itemStage: stageName,
        budgetedAmount: item.budgetedTotalAmount || 0,
        accumulatedCost: item.accumulatedActualCost || 0,
        physicalProgressPercentage: item.currentPhysicalProgressPercentage || 0,
        plannedProgressPercentage: 0,
        budgetedUnitPrice: item.budgetedUnitPrice || 0,
      });
      setItemAlert(analysis);
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !selectedProjectId || !user) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const expenseData = {
      projectId: selectedProjectId,
      budgetItemId: selectedItemId,
      expenseDate: date.toISOString(),
      totalAmount: Number(formData.get('amount')),
      supplierName: formData.get('supplier') as string,
      documentNumber: formData.get('document') as string,
      resourceType: formData.get('resourceType') as string,
      isOutOfBudget: !selectedItemId,
      isCertified: false,
      managementComment: formData.get('comment') as string,
      creationDate: new Date().toISOString(),
      responsibleAnalystId: user.uid,
      projectMembers: { [user.uid]: 'admin' }
    };

    try {
      await addDocumentNonBlocking(collection(firestore, `projects/${selectedProjectId}/expenses`), expenseData);
      toast({ title: "Gasto Registrado", description: "La transacción se ha guardado correctamente." });
      setSelectedItemId("");
      setItemAlert(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el gasto." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Cargando tus obras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo de Gastos</h1>
          <p className="text-muted-foreground">Control financiero y trazabilidad por ítem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" type="button">
            <Camera className="w-4 h-4" /> Captura Rápida
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" className="gap-2 pointer-events-none" disabled={loadingOCR} type="button">
              {loadingOCR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loadingOCR ? 'Procesando...' : 'OCR Factura'}
            </Button>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs uppercase font-bold text-primary">Seleccionar Obra para Imputar Gasto</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Busca o selecciona una obra..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase font-bold opacity-70">Presupuesto Objetivo</p>
                <p className="text-lg font-bold">${(selectedProject.totalBudgetAmount || 0).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground text-center max-w-xs">
            Por favor, selecciona una obra en la tarjeta superior para comenzar el registro de gastos.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitExpense} className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8 space-y-6">
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">1. Datos del Comprobante</CardTitle>
                <CardDescription>Respaldo físico de la transacción</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fecha de Emisión</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Seleccionar fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Proveedor / Subcontratista</Label>
                  <Input name="supplier" placeholder="Ej: Corralón MDP" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo y Nº Documento</Label>
                  <Input name="document" placeholder="Factura A 0001-..." required />
                </div>
                <div className="space-y-2">
                  <Label>Monto Total ($)</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">2. Imputación al Presupuesto</CardTitle>
                <CardDescription>Vincular este gasto con un ítem de obra</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ítem de Cómputo (Presupuesto)</Label>
                  <Select value={selectedItemId} onValueChange={handleItemChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={budgetLoading ? "Cargando ítems..." : "Seleccionar ítem..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetItems?.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          [{item.code}] {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Tipo de Recurso</Label>
                    <RadioGroup name="resourceType" defaultValue="material" className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="material" id="r1" />
                        <Label htmlFor="r1">Material</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="labor" id="r2" />
                        <Label htmlFor="r2">Mano de Obra</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">3. Comentarios del Analista</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea name="comment" placeholder="Justificación del gasto o detalles de aplicación..." />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-4 space-y-6">
            <Card className="shadow-lg border-2 border-primary sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" /> Verificación IA
                </CardTitle>
                <CardDescription>Control de desvíos en tiempo real</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAnalyzing ? (
                   <div className="p-8 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground animate-pulse">Analizando impacto financiero...</p>
                  </div>
                ) : !itemAlert ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <p className="text-xs italic">La IA analizará este gasto respecto al presupuesto base una vez selecciones el ítem.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={cn(
                      "p-4 rounded-lg flex gap-3",
                      itemAlert.statusColor === 'Rojo' ? "bg-red-50 text-red-700 border border-red-100" : 
                      itemAlert.statusColor === 'Amarillo' ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-green-50 text-green-700 border border-green-100"
                    )}>
                      {itemAlert.statusColor === 'Verde' ? <CheckCircle2 className="shrink-0 mt-1" /> : <AlertCircle className="shrink-0 mt-1" />}
                      <div>
                        <p className="font-bold text-xs uppercase">{itemAlert.statusColor}</p>
                        <p className="text-xs leading-tight mt-1">{itemAlert.executiveSummary}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Recomendaciones</p>
                      {itemAlert.suggestedActions.map((s: string, i: number) => (
                        <div key={i} className="text-[10px] p-2 bg-muted rounded">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar Registro
                </Button>
                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setSelectedProjectId("")}>
                  Cancelar y Cambiar Obra
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}