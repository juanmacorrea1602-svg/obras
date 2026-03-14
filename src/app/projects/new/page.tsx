
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
import { Save, Plus, Trash2, HardHat, Gavel, Calculator, Info, ShieldAlert, Loader2 } from 'lucide-react';

export default function NewProjectPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("type");

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

  const [stages, setStages] = useState([{ name: '', plannedStartDate: '', plannedEndDate: '' }]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCostIncidencias({ ...costIncidencias, [e.target.name]: Number(e.target.value) });
  };

  const addStage = () => setStages([...stages, { name: '', plannedStartDate: '', plannedEndDate: '' }]);
  const removeStage = (index: number) => setStages(stages.filter((_, i) => i !== index));

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
            await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/stages`), {
              ...stage,
              projectId: projectRef.id,
              responsibleAnalystId: user.uid,
              status: 'PENDIENTE'
            });
          }
        }
      }

      toast({ title: 'Obra Registrada', description: 'La obra ha sido enviada a revisión técnica.' });
      router.push('/projects');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al guardar la obra.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Entrada de Obra</h1>
          <p className="text-muted-foreground">Flujo unificado de preventa y configuración técnica.</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="type" className="gap-2"><Gavel className="w-4 h-4" /> Clasificación</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Info className="w-4 h-4" /> Datos Grales</TabsTrigger>
          <TabsTrigger value="stages" className="gap-2"><HardHat className="w-4 h-4" /> Etapas</TabsTrigger>
          <TabsTrigger value="costs" className="gap-2"><Calculator className="w-4 h-4" /> Incidencias</TabsTrigger>
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
                  Dependiendo del tipo seleccionado, el sistema habilitará cláusulas de ajuste CAC o certificaciones por ítem específicas. Todas las obras nuevas nacen como <strong>Pendiente de Aprobación</strong>.
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
              <Button onClick={() => setActiveTab("stages")}>Siguiente: Cronograma</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingeniería de Etapas</CardTitle>
                <CardDescription>Define las fases para el control de certificaciones.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addStage} className="gap-2">
                <Plus className="w-4 h-4" /> Añadir Etapa
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {stages.map((stage, index) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/20 relative grid sm:grid-cols-3 gap-4">
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 bg-background border rounded-full text-destructive shadow-sm" onClick={() => removeStage(index)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="col-span-1 space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Etapa</Label>
                    <Input placeholder="Ej: Fundaciones" value={stage.name} onChange={(e) => {
                      const newStages = [...stages];
                      newStages[index].name = e.target.value;
                      setStages(newStages);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Inicio Planificado</Label>
                    <Input type="date" value={stage.plannedStartDate} onChange={(e) => {
                      const newStages = [...stages];
                      newStages[index].plannedStartDate = e.target.value;
                      setStages(newStages);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Fin Planificado</Label>
                    <Input type="date" value={stage.plannedEndDate} onChange={(e) => {
                      const newStages = [...stages];
                      newStages[index].plannedEndDate = e.target.value;
                      setStages(newStages);
                    }} />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setActiveTab("general")}>Anterior</Button>
              <Button onClick={() => setActiveTab("costs")}>Siguiente: Matriz de Costos</Button>
            </CardFooter>
          </Card>
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
