"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { CheckCircle2, ClipboardCheck, Loader2, Search, Camera, UserCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProgressPage() {
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);
  
  // States
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [signatureImages, setSignatureImages] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Queries
  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'projects'), where('responsibleAnalystId', '==', user.uid));
  }, [user, firestore]);

  const budgetItemsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return collection(firestore, `projects/${selectedProjectId}/budgetItems`);
  }, [firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: budgetItems, isLoading: budgetLoading } = useCollection(budgetItemsQuery);

  // Initialize sliders with current DB values
  useEffect(() => {
    if (budgetItems) {
      const initialValues: Record<string, number> = {};
      budgetItems.forEach(item => {
        initialValues[item.id] = item.currentPhysicalProgressPercentage || 0;
      });
      setProgressValues(initialValues);
    }
  }, [budgetItems]);

  if (!mounted) return null;

  const handleSliderChange = (itemId: string, value: number[]) => {
    setProgressValues(prev => ({ ...prev, [itemId]: value[0] }));
  };

  const handleFileUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureImages(prev => ({ ...prev, [itemId]: event.target?.result as string }));
      toast({
        title: "Firma/Documento cargado",
        description: "La evidencia se adjuntará a la certificación.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCertify = async (item: any) => {
    if (!firestore || !selectedProjectId || !user) return;
    
    const newProgress = progressValues[item.id];
    const oldProgress = item.currentPhysicalProgressPercentage || 0;
    const reportedPercentage = newProgress - oldProgress;

    if (reportedPercentage <= 0) {
      toast({
        variant: "destructive",
        title: "Error de certificación",
        description: "El nuevo avance debe ser mayor al actual.",
      });
      return;
    }

    setIsSubmitting(item.id);

    try {
      // 1. Crear entrada de progreso físico
      const progressEntry = {
        budgetItemId: item.id,
        projectId: selectedProjectId,
        entryDate: new Date().toISOString(),
        reportedPercentage: reportedPercentage,
        totalItemCompletionPercentage: newProgress,
        certifiedByUserId: user.uid,
        comments: `Certificación manual de campo.`,
        creationDate: new Date().toISOString()
      };

      await addDocumentNonBlocking(
        collection(firestore, `projects/${selectedProjectId}/physicalProgressEntries`), 
        progressEntry
      );

      // 2. Actualizar el ítem de presupuesto
      const itemRef = doc(firestore, `projects/${selectedProjectId}/budgetItems`, item.id);
      await updateDocumentNonBlocking(itemRef, {
        currentPhysicalProgressPercentage: newProgress,
        lastUpdateDate: new Date().toISOString()
      });

      // 3. Registrar la firma/imagen como documento si existe
      if (signatureImages[item.id]) {
        await addDocumentNonBlocking(collection(firestore, `projects/${selectedProjectId}/documents`), {
          projectId: selectedProjectId,
          linkedBudgetItemId: item.id,
          fileName: `Firma_Certificacion_${item.code}.png`,
          fileType: 'image/png',
          fileUrl: signatureImages[item.id],
          uploadDate: new Date().toISOString(),
          description: `Firma del profesional habilitante para el ítem ${item.name}`,
          category: 'Avance Obra'
        });
      }

      toast({
        title: "Ítem Certificado",
        description: `Se ha registrado un avance del ${newProgress}% para ${item.name}.`,
      });

      setSignatureImages(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar la certificación.",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Cargando tablero de certificación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificación de Campo</h1>
          <p className="text-muted-foreground">Actualización de avance físico real y validación de firma</p>
        </div>
        <div className="bg-accent/10 px-4 py-2 rounded-full flex items-center gap-2 border border-accent/20">
          <UserCheck className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold text-accent uppercase">Rol: Certificador Habilitado</span>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs uppercase font-bold text-primary">Obra a Certificar</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona la obra donde se realiza la medición..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground text-center max-w-xs">
            Selecciona una obra para visualizar los ítems de presupuesto pendientes de certificación técnica.
          </p>
        </div>
      ) : budgetLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Cargando ítems de cómputo...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {budgetItems && budgetItems.length > 0 ? budgetItems.map((item) => (
            <Card key={item.id} className="shadow-sm border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  <div className="p-6 lg:w-1/3 bg-muted/20 border-r border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{item.code}</Badge>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                      <div>
                        <p>Presupuesto Base</p>
                        <p className="text-sm text-foreground">${(item.budgetedTotalAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p>Último Avance</p>
                        <p className="text-sm text-foreground">{item.currentPhysicalProgressPercentage || 0}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <Label className="text-xs font-bold uppercase">Nuevo Avance Físico (%)</Label>
                        <span className="text-3xl font-black text-primary">
                          {progressValues[item.id] || 0}%
                        </span>
                      </div>
                      <Slider 
                        value={[progressValues[item.id] || 0]} 
                        max={100} 
                        step={0.5} 
                        onValueChange={(val) => handleSliderChange(item.id, val)}
                        className="py-4"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium italic">
                        <span>0% (Inicio)</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          (progressValues[item.id] || 0) > (item.currentPhysicalProgressPercentage || 0) ? "bg-green-100 text-green-700" : "bg-muted"
                        )}>
                          Incremento: {((progressValues[item.id] || 0) - (item.currentPhysicalProgressPercentage || 0)).toFixed(1)}%
                        </span>
                        <span>100% (Finalizado)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 lg:w-1/4 flex flex-col justify-between bg-muted/5 border-l border-border gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Firma / Evidencia</Label>
                      <div className="relative">
                        <label className={cn(
                          "flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                          signatureImages[item.id] ? "border-accent bg-accent/5" : "border-muted-foreground/20 hover:bg-muted"
                        )}>
                          {signatureImages[item.id] ? (
                            <img src={signatureImages[item.id]} className="h-full object-contain p-2" alt="Firma" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                              <span className="text-[10px] text-muted-foreground">Cargar Firma</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(item.id, e)} />
                        </label>
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2 bg-accent hover:bg-accent/90 shadow-sm"
                      disabled={isSubmitting === item.id || (progressValues[item.id] || 0) <= (item.currentPhysicalProgressPercentage || 0)}
                      onClick={() => handleCertify(item)}
                    >
                      {isSubmitting === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Certificar Avance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="p-12 border border-dashed rounded-xl text-center bg-muted/5">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">Esta obra aún no tiene ítems de presupuesto cargados.</p>
              <Button asChild variant="link" size="sm">
                <Link href={`/projects/${selectedProjectId}`}>Configurar Presupuesto</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}