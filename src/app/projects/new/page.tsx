"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, Plus, Trash2, HardHat, Gavel, Calculator, Info, 
  ShieldAlert, Loader2, DollarSign, Ruler, FileText, 
  Upload, Sparkles, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BudgetBreakdown = {
  category: 'material' | 'labor' | 'service' | 'machinery' | 'other';
  amount: number;
};

type StageWithBudget = {
  name: string;
  plannedStartDate: string;
  plannedEndDate: string;
  budgetBreakdown: BudgetBreakdown[];
};

export default function NewProjectPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("type");
  const [mounted, setMounted] = useState(false);
  const [analyzingPlans, setAnalyzingPlans] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const configRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `user_profiles/${user.uid}/config/global`);
  }, [user, firestore]);
  
  const { data: globalConfig } = useDoc(configRef);

  const [formData, setFormData] = useState({
    name: '',
    type: 'licitacion_privada',
    workType: 'vivienda_unifamiliar',
    surfaceSqm: '',
    description: '',
    location: '',
    totalBudgetAmount: '',
    marginPercentage: '15',
    currentStatus: 'PENDIENTE_APROBACION'
  });

  const [costIncidencias, setCostIncidencias] = useState({
    artPercentage: 0,
    socialCharges: 0,
    fondoCese: 0,
    inactivityFactor: 0,
    contingencyReserve: 5,
    generalExpenses: 10,
    financialCost: 2
  });

  const [stages, setStages] = useState<StageWithBudget[]>([
    { name: 'Preliminares y Movimiento de Suelos', plannedStartDate: '', plannedEndDate: '', budgetBreakdown: [] }
  ]);

  useEffect(() => {
    if (globalConfig) {
      setCostIncidencias(prev => ({
        ...prev,
        artPercentage: globalConfig.artPercentage || 4,
        socialCharges: globalConfig.socialCharges || 24,
        fondoCese: globalConfig.fondoCeseL1 || 12,
        inactivityFactor: globalConfig.inactivityFactor || 15,
        contingencyReserve: globalConfig.contingencyReserve || 5
      }));
    }
  }, [globalConfig]);

  useEffect(() => {
    if (!globalConfig) return;
    const sqm = Number(formData.surfaceSqm);
    if (!sqm) return;

    let baseCost = 0;
    switch (formData.workType) {
      case 'vivienda_unifamiliar': baseCost = globalConfig.viviendaSqmCost || 850000; break;
      case 'edificio_altura': baseCost = globalConfig.edificioSqmCost || 1200000; break;
      case 'obra_civil_comercial': baseCost = globalConfig.civilSqmCost || 950000; break;
      case 'industrial': baseCost = globalConfig.industrialSqmCost || 750000; break;
    }

    if (baseCost > 0) {
      setFormData(prev => ({ ...prev, totalBudgetAmount: (sqm * baseCost).toString() }));
    }
  }, [formData.surfaceSqm, formData.workType, globalConfig]);

  if (!mounted) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCostIncidencias({ ...costIncidencias, [e.target.name]: Number(e.target.value) });
  };

  const addStage = () => setStages([...stages, { name: '', plannedStartDate: '', plannedEndDate: '', budgetBreakdown: [] }]);
  const removeStage = (index: number) => setStages(stages.filter((_, i) => i !== index));

  const addBudgetToStage = (stageIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].budgetBreakdown.push({ category: 'material', amount: 0 });
    setStages(newStages);
  };

  const calculateTotalTechnicalCost = () => {
    return stages.reduce((acc, stage) => {
      return acc + stage.budgetBreakdown.reduce((sacc, item) => sacc + (item.amount || 0), 0);
    }, 0);
  };

  const simulatePlanAnalysis = () => {
    setAnalyzingPlans(true);
    setTimeout(() => {
      setAnalyzingPlans(false);
      toast({
        title: "Cómputo Extraído",
        description: "Se han identificado 4 etapas sugeridas basadas en la tipología del plano.",
      });
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!user || !firestore) return;
    if (!formData.name || !formData.totalBudgetAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre y presupuesto son obligatorios.' });
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        ...formData,
        surfaceSqm: Number(formData.surfaceSqm),
        totalBudgetAmount: Number(formData.totalBudgetAmount),
        marginPercentage: Number(formData.marginPercentage),
        costConfig: costIncidencias,
        responsibleAnalystId: user.uid,
        projectMembers: { [user.uid]: 'admin' },
        creationDate: new Date().toISOString(),
        startDate: new Date().toISOString(),
        plannedEndDate: new Date().toISOString()
      };

      const projectRef = await addDocumentNonBlocking(collection(firestore, 'projects'), projectData);
      
      if (projectRef) {
        for (const stage of stages) {
          if (stage.name) {
            const stageRef = await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/stages`), {
              name: stage.name,
              plannedStartDate: stage.plannedStartDate,
              plannedEndDate: stage.plannedEndDate,
              projectId: projectRef.id,
              responsibleAnalystId: user.uid,
              status: 'PENDIENTE'
            });

            if (stageRef) {
              for (const budget of stage.budgetBreakdown) {
                if (budget.amount > 0) {
                  await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/budgetItems`), {
                    projectId: projectRef.id,
                    stageId: stageRef.id,
                    code: 'APU',
                    name: `Gasto Rubro ${budget.category.toUpperCase()}: ${stage.name}`,
                    budgetedQuantity: 1,
                    budgetedUnit: 'GL',
                    budgetedUnitPrice: budget.amount,
                    budgetedTotalAmount: budget.amount,
                    plannedStartDate: stage.plannedStartDate,
                    plannedEndDate: stage.plannedEndDate,
                    currentPhysicalProgressPercentage: 0,
                    accumulatedActualCost: 0,
                    lastUpdateDate: new Date().toISOString(),
                    responsibleAnalystId: user.uid,
                    resourceType: budget.category
                  });
                }
              }
            }
          }
        }
      }

      toast({ title: 'Ingeniería Completada', description: 'La obra ha sido enviada a auditoría con su línea base financiera.' });
      router.push('/projects/pending');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al guardar la ingeniería de obra.' });
    } finally {
      setLoading(false);
    }
  };

  const totalTechnicalCost = calculateTotalTechnicalCost();
  const targetBudget = Number(formData.totalBudgetAmount) || 0;
  const markup = 1 + (costIncidencias.marginPercentage / 100 || 0.15) + (costIncidencias.contingencyReserve / 100) + (costIncidencias.generalExpenses / 100);
  const breakEvenPoint = totalTechnicalCost * (1 + (costIncidencias.financialCost / 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ingeniería de Costos (Nueva Obra)</h1>
            <p className="text-muted-foreground">Proceso de determinación de línea base y presupuesto técnico.</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted/50 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Costo Técnico Directo</p>
            <p className="text-lg font-bold">${totalTechnicalCost.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-primary">Punto de Equilibrio</p>
            <p className="text-lg font-bold">${breakEvenPoint.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-accent">Precio Oferta Sugerido</p>
            <p className="text-lg font-bold text-accent">${(totalTechnicalCost * markup).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-none", targetBudget < breakEvenPoint ? "bg-destructive/10" : "bg-muted/30")}>
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Monto Objetivo Venta</p>
            <p className={cn("text-lg font-bold", targetBudget < breakEvenPoint ? "text-destructive" : "")}>
              ${targetBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="type" className="gap-2 text-xs md:text-sm"><Gavel className="w-4 h-4" /> 1. Clasificación</TabsTrigger>
          <TabsTrigger value="general" className="gap-2 text-xs md:text-sm"><Info className="w-4 h-4" /> 2. Datos Grales</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2 text-xs md:text-sm"><Upload className="w-4 h-4" /> 3. Planos</TabsTrigger>
          <TabsTrigger value="stages" className="gap-2 text-xs md:text-sm"><Calculator className="w-4 h-4" /> 4. Cómputo e Ítems</TabsTrigger>
          <TabsTrigger value="costs" className="gap-2 text-xs md:text-sm"><ShieldAlert className="w-4 h-4" /> 5. Ingeniería Financiera</TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clasificación del Proyecto</CardTitle>
              <CardDescription>Determine la naturaleza jurídica y comercial del contrato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label>Origen de la Obra</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licitacion_privada">Licitación Privada</SelectItem>
                    <SelectItem value="licitacion_publica">Licitación Pública (Régimen Ley 13.064)</SelectItem>
                    <SelectItem value="presupuesto_propio">Inversión Propia (Desarrollo)</SelectItem>
                    <SelectItem value="cliente_externo">Administración / Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border flex gap-4">
                <div className="bg-primary/10 p-2 rounded-full h-fit">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta clasificación define el motor de auditoría de desvíos. Las obras públicas requieren una trazabilidad estricta de certificaciones para redeterminaciones de precios.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end"><Button onClick={() => setActiveTab("general")}>Siguiente</Button></CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Identificación Técnica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Nombre de Referencia</Label>
                <Input name="name" placeholder="Ej: Torre Maral 54 - Estructura" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipología Constructiva</Label>
                  <Select value={formData.workType} onValueChange={(val) => setFormData({...formData, workType: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivienda_unifamiliar">Vivienda Unifamiliar</SelectItem>
                      <SelectItem value="edificio_altura">Edificio en Altura</SelectItem>
                      <SelectItem value="obra_civil_comercial">Obra Civil Comercial</SelectItem>
                      <SelectItem value="industrial">Nave Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Superficie Estimada (m²)</Label>
                  <Input name="surfaceSqm" type="number" placeholder="0.00" value={formData.surfaceSqm} onChange={handleInputChange} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Monto Objetivo de Venta / Contrato ($)</Label>
                <Input name="totalBudgetAmount" type="number" value={formData.totalBudgetAmount} onChange={handleInputChange} className="font-bold bg-primary/5" />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setActiveTab("type")}>Anterior</Button>
              <Button onClick={() => setActiveTab("plans")}>Siguiente: Carga de Planos</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentación y Planos</CardTitle>
              <CardDescription>Cargue los documentos base para el cómputo métrico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs font-bold">Planos de Arquitectura</p>
                  <p className="text-[10px] text-muted-foreground">PDF, DWG, JPG</p>
                </div>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs font-bold">Planos de Estructura</p>
                  <p className="text-[10px] text-muted-foreground">Cómputo de Hierro y Hº</p>
                </div>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs font-bold">Pliego de Condiciones</p>
                  <p className="text-[10px] text-muted-foreground">Especificaciones Técnicas</p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm font-bold">Motor de Lectura Genkit</p>
                    <p className="text-xs text-muted-foreground">Inicia el análisis de planos para sugerir ítems de cómputo métrico.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={simulatePlanAnalysis} disabled={analyzingPlans}>
                  {analyzingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analizar con IA"}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setActiveTab("general")}>Anterior</Button>
              <Button onClick={() => setActiveTab("stages")}>Siguiente: Planilla de Ítems</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Planilla de Ítems y Cómputo</h3>
              <Button variant="outline" size="sm" onClick={addStage} className="gap-2"><Plus className="w-4 h-4" /> Nueva Etapa</Button>
            </div>

            {stages.map((stage, sIdx) => (
              <Card key={sIdx} className="border-l-4 border-l-primary shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Nombre de la Etapa / Rubro</Label>
                      <Input value={stage.name} onChange={(e) => {
                        const newStages = [...stages];
                        newStages[sIdx].name = e.target.value;
                        setStages(newStages);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Inicio Planificado</Label>
                      <Input type="date" value={stage.plannedStartDate} onChange={(e) => {
                        const newStages = [...stages];
                        newStages[sIdx].plannedStartDate = e.target.value;
                        setStages(newStages);
                      }} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Fin Planificado</Label>
                        <Input type="date" value={stage.plannedEndDate} onChange={(e) => {
                          const newStages = [...stages];
                          newStages[sIdx].plannedEndDate = e.target.value;
                          setStages(newStages);
                        }} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => removeStage(sIdx)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg space-y-3 border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 mb-2">
                      <Calculator className="w-3 h-3" /> Desglose de Gastos por Etapa (APU Simplificado)
                    </p>
                    {stage.budgetBreakdown.map((budget, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <Select value={budget.category} onValueChange={(val) => {
                          const newStages = [...stages];
                          newStages[sIdx].budgetBreakdown[bIdx].category = val as any;
                          setStages(newStages);
                        }}>
                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="material">Materiales (Inc. Desperdicio)</SelectItem>
                            <SelectItem value="labor">Mano de Obra (Inc. Cargas)</SelectItem>
                            <SelectItem value="service">Servicios / Subcontratos</SelectItem>
                            <SelectItem value="machinery">Maquinaria y Equipos</SelectItem>
                            <SelectItem value="other">Gastos de Obra / Varios</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative w-32">
                          <DollarSign className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                          <Input type="number" className="h-8 pl-6 text-xs" value={budget.amount} onChange={(e) => {
                            const newStages = [...stages];
                            newStages[sIdx].budgetBreakdown[bIdx].amount = Number(e.target.value);
                            setStages(newStages);
                          }} />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          const newStages = [...stages];
                          newStages[sIdx].budgetBreakdown = newStages[sIdx].budgetBreakdown.filter((_, i) => i !== bIdx);
                          setStages(newStages);
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary" onClick={() => addBudgetToStage(sIdx)}>+ AGREGAR RUBRO DE GASTO</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <CardFooter className="justify-between px-0">
              <Button variant="outline" onClick={() => setActiveTab("plans")}>Anterior</Button>
              <Button onClick={() => setActiveTab("costs")}>Siguiente: Ingeniería Financiera</Button>
            </CardFooter>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cierre de Presupuesto y Markup</CardTitle>
                  <CardDescription>Defina los coeficientes de pase para llegar al precio de oferta final.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Gastos Indirectos</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-xs">Gastos Grales Empresa (%)</Label>
                          <Input name="generalExpenses" type="number" value={costIncidencias.generalExpenses} onChange={handleCostChange} />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-xs">Costo Financiero (%)</Label>
                          <Input name="financialCost" type="number" value={costIncidencias.financialCost} onChange={handleCostChange} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Márgenes y Riesgos</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-xs">Reserva Contingencia (%)</Label>
                          <Input name="contingencyReserve" type="number" value={costIncidencias.contingencyReserve} onChange={handleCostChange} />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-xs">Beneficio Neto Deseado (%)</Label>
                          <Input name="marginPercentage" type="number" value={formData.marginPercentage} onChange={handleInputChange} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
                <div className="text-xs text-orange-800 leading-tight">
                  <p className="font-bold mb-1 uppercase">Validación de Rentabilidad</p>
                  Su precio objetivo de venta (${targetBudget.toLocaleString()}) está {targetBudget < breakEvenPoint ? "POR DEBAJO" : "POR ENCIMA"} de su punto de equilibrio financiero (${breakEvenPoint.toLocaleString()}). {targetBudget < breakEvenPoint && "Esta obra generará pérdidas operativas con la configuración actual."}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 space-y-4">
              <Card className="bg-primary text-white sticky top-6">
                <CardHeader><CardTitle className="text-sm uppercase font-black">Resumen del Cierre</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-xs opacity-80"><span>Costo Directo:</span><span>${totalTechnicalCost.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs opacity-80"><span>G.G. + Contingencias:</span><span>+${(totalTechnicalCost * ((costIncidencias.generalExpenses + costIncidencias.contingencyReserve)/100)).toLocaleString()}</span></div>
                  <Separator className="bg-white/20" />
                  <div className="flex justify-between font-bold"><span>Total Costo Empresa:</span><span>${breakEvenPoint.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs text-accent-foreground font-bold"><span>Margen Proyectado:</span><span>+${(targetBudget - breakEvenPoint).toLocaleString()}</span></div>
                  <div className="pt-4">
                    <p className="text-[10px] uppercase font-bold opacity-70">Precio Sugerido Venta</p>
                    <p className="text-3xl font-black">${(totalTechnicalCost * markup).toLocaleString()}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-accent hover:bg-accent/90 gap-2" onClick={handleSubmit} disabled={loading || totalTechnicalCost === 0}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar Ingeniería y Enviar
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
