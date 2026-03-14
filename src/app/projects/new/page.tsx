
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, HardHat, Gavel, Calculator, Info, ShieldAlert, Loader2, DollarSign, Package, User, Wrench, MoreHorizontal } from 'lucide-react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Global Config to pre-populate costs
  const configRef = user && firestore ? doc(firestore, `user_profiles/${user.uid}/config/global`) : null;
  const { data: globalConfig } = useDoc(configRef);

  const [formData, setFormData] = useState({
    name: '',
    type: 'licitacion_privada',
    workType: 'vivienda_unifamiliar',
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
    contingencyReserve: 0
  });

  const [stages, setStages] = useState<StageWithBudget[]>([
    { name: '', plannedStartDate: '', plannedEndDate: '', budgetBreakdown: [] }
  ]);

  useEffect(() => {
    if (globalConfig) {
      setCostIncidencias({
        artPercentage: globalConfig.artPercentage || 4,
        socialCharges: globalConfig.socialCharges || 24,
        fondoCese: globalConfig.fondoCeseL1 || 12,
        inactivityFactor: globalConfig.inactivityFactor || 15,
        contingencyReserve: globalConfig.contingencyReserve || 5
      });
    }
  }, [globalConfig]);

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

  const removeBudgetFromStage = (stageIndex: number, budgetIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].budgetBreakdown = newStages[stageIndex].budgetBreakdown.filter((_, i) => i !== budgetIndex);
    setStages(newStages);
  };

  const updateBudgetInStage = (stageIndex: number, budgetIndex: number, field: keyof BudgetBreakdown, value: any) => {
    const newStages = [...stages];
    newStages[stageIndex].budgetBreakdown[budgetIndex] = {
      ...newStages[stageIndex].budgetBreakdown[budgetIndex],
      [field]: field === 'amount' ? Number(value) : value
    };
    setStages(newStages);
  };

  const calculateTotalBudgeted = () => {
    return stages.reduce((acc, stage) => {
      return acc + stage.budgetBreakdown.reduce((sacc, item) => sacc + (item.amount || 0), 0);
    }, 0);
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

            // Crear items de presupuesto a partir del desglose
            if (stageRef) {
              for (const budget of stage.budgetBreakdown) {
                if (budget.amount > 0) {
                  await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/budgetItems`), {
                    projectId: projectRef.id,
                    stageId: stageRef.id,
                    code: 'PREV',
                    name: `Presupuesto ${budget.category.toUpperCase()}: ${stage.name}`,
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

      toast({ title: 'Obra Registrada', description: 'La obra ha sido enviada a revisión técnica con su presupuesto base.' });
      router.push('/projects');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al guardar la obra.' });
    } finally {
      setLoading(false);
    }
  };

  const totalBudgeted = calculateTotalBudgeted();
  const targetBudget = Number(formData.totalBudgetAmount) || 0;
  const budgetGap = targetBudget - totalBudgeted;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <HardHat className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nueva Entrada de Obra</h1>
            <p className="text-muted-foreground">Flujo unificado de preventa y configuración técnica.</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted/50 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Monto Objetivo</p>
            <p className="text-lg font-bold">${targetBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-primary">Costo Presupuestado</p>
            <p className="text-lg font-bold">${totalBudgeted.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-none", budgetGap < 0 ? "bg-destructive/10" : "bg-accent/10")}>
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Diferencia / Margen</p>
            <p className={cn("text-lg font-bold", budgetGap < 0 ? "text-destructive" : "text-accent")}>
              ${budgetGap.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Etapas Definidas</p>
            <p className="text-lg font-bold">{stages.filter(s => s.name).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="type" className="gap-2"><Gavel className="w-4 h-4" /> Clasificación</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Info className="w-4 h-4" /> Datos Grales</TabsTrigger>
          <TabsTrigger value="stages" className="gap-2"><Calculator className="w-4 h-4" /> Etapas y Presupuesto</TabsTrigger>
          <TabsTrigger value="costs" className="gap-2"><ShieldAlert className="w-4 h-4" /> Incidencias</TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Proyecto / Licitación</CardTitle>
              <CardDescription>Define la naturaleza del contrato para el motor de cálculo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label>Origen del Proyecto</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licitacion_privada">Licitación Privada</SelectItem>
                    <SelectItem value="licitacion_publica">Licitación Pública</SelectItem>
                    <SelectItem value="presupuesto_propio">Presupuesto Propio (Inversión)</SelectItem>
                    <SelectItem value="cliente_externo">Cliente Externo (Obra por Administración)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border flex gap-4">
                <div className="bg-primary/10 p-2 rounded-full h-fit">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  El tipo de proyecto influye en cómo la IA auditará los desvíos. Las licitaciones públicas suelen tener mayores restricciones presupuestarias por ítem.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={() => setActiveTab("general")}>Siguiente: Datos Generales</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Identificación y Ubicación</CardTitle>
              <CardDescription>Localización y tipología constructiva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Obra</Label>
                <Input id="name" name="name" placeholder="Ej: Torre Maral 54" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de Trabajo</Label>
                  <Select value={formData.workType} onValueChange={(val) => setFormData({...formData, workType: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivienda_unifamiliar">Vivienda Unifamiliar</SelectItem>
                      <SelectItem value="edificio_altura">Edificio en Altura</SelectItem>
                      <SelectItem value="obra_civil_comercial">Obra Civil Comercial</SelectItem>
                      <SelectItem value="industrial">Nave Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Ubicación</Label>
                  <Input name="location" placeholder="Ciudad, Barrio..." value={formData.location} onChange={handleInputChange} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Monto Objetivo de Venta / Presupuesto ($)</Label>
                <Input name="totalBudgetAmount" type="number" placeholder="0.00" value={formData.totalBudgetAmount} onChange={handleInputChange} className="text-xl font-bold" />
              </div>
              <div className="grid gap-2">
                <Label>Descripción / Alcance</Label>
                <Textarea name="description" placeholder="Resumen del alcance técnico..." value={formData.description} onChange={handleInputChange} />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setActiveTab("type")}>Anterior</Button>
              <Button onClick={() => setActiveTab("stages")}>Siguiente: Presupuesto por Etapas</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Desglose de Ingeniería y Costos</h3>
              <Button variant="outline" size="sm" onClick={addStage} className="gap-2">
                <Plus className="w-4 h-4" /> Añadir Etapa
              </Button>
            </div>

            {stages.map((stage, sIdx) => (
              <Card key={sIdx} className="border-l-4 border-l-primary">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Nombre de la Etapa</Label>
                        <Input 
                          placeholder="Ej: Fundaciones" 
                          value={stage.name} 
                          onChange={(e) => {
                            const newStages = [...stages];
                            newStages[sIdx].name = e.target.value;
                            setStages(newStages);
                          }} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Inicio</Label>
                        <Input type="date" value={stage.plannedStartDate} onChange={(e) => {
                          const newStages = [...stages];
                          newStages[sIdx].plannedStartDate = e.target.value;
                          setStages(newStages);
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Fin</Label>
                        <Input type="date" value={stage.plannedEndDate} onChange={(e) => {
                          const newStages = [...stages];
                          newStages[sIdx].plannedEndDate = e.target.value;
                          setStages(newStages);
                        }} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeStage(sIdx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Calculator className="w-3 h-3" /> Presupuesto por Rubro
                      </p>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => addBudgetToStage(sIdx)}>
                        <Plus className="w-3 h-3 mr-1" /> AGREGAR GASTO
                      </Button>
                    </div>

                    {stage.budgetBreakdown.map((budget, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Select 
                            value={budget.category} 
                            onValueChange={(val) => updateBudgetInStage(sIdx, bIdx, 'category', val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="material">Materiales</SelectItem>
                              <SelectItem value="labor">Mano de Obra</SelectItem>
                              <SelectItem value="service">Servicios</SelectItem>
                              <SelectItem value="machinery">Maquinaria</SelectItem>
                              <SelectItem value="other">Otros / Varios</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                            <Input 
                              type="number" 
                              className="h-8 pl-6 text-xs" 
                              placeholder="Monto"
                              value={budget.amount}
                              onChange={(e) => updateBudgetInStage(sIdx, bIdx, 'amount', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBudgetFromStage(sIdx, bIdx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex justify-end pt-2 border-t border-border">
                      <p className="text-xs font-bold">
                        Subtotal Etapa: <span className="text-primary">${stage.budgetBreakdown.reduce((acc, b) => acc + (b.amount || 0), 0).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <CardFooter className="justify-between px-0">
              <Button variant="outline" onClick={() => setActiveTab("general")}>Anterior</Button>
              <Button onClick={() => setActiveTab("costs")}>Siguiente: Matriz de Costos</Button>
            </CardFooter>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Costos e Incidencias</CardTitle>
              <CardDescription>Parámetros financieros heredados de la Sala de Máquinas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Incidencias Directas (MO)</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">ART (%)</Label>
                      <Input name="artPercentage" type="number" value={costIncidencias.artPercentage} onChange={handleCostChange} />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Cargas Soc. (%)</Label>
                      <Input name="socialCharges" type="number" value={costIncidencias.socialCharges} onChange={handleCostChange} />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Fondo Cese (%)</Label>
                      <Input name="fondoCese" type="number" value={costIncidencias.fondoCese} onChange={handleCostChange} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Factores y Riesgos</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Inactividad (%)</Label>
                      <Input name="inactivityFactor" type="number" value={costIncidencias.inactivityFactor} onChange={handleCostChange} />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Contingencia (%)</Label>
                      <Input name="contingencyReserve" type="number" value={costIncidencias.contingencyReserve} onChange={handleCostChange} />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-xs">Margen Com. (%)</Label>
                      <Input name="marginPercentage" type="number" value={formData.marginPercentage} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t pt-6">
              <Button variant="outline" onClick={() => setActiveTab("stages")}>Anterior</Button>
              <Button className="bg-accent hover:bg-accent/90 gap-2" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Registrar y Pendiente Aprobación
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
