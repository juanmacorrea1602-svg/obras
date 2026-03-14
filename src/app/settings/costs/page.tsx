
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import { HardHat, ShieldAlert, Loader2, Save, Calculator, MapPin, Layers, Database, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GlobalCostsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const configRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `user_profiles/${user.uid}/config/global`);
  }, [user, firestore]);

  const { data: config, isLoading } = useDoc(configRef);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!configRef) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      uocraBasic: Number(formData.get('uocraBasic')),
      attendanceBonus: Number(formData.get('attendanceBonus')),
      socialCharges: Number(formData.get('socialCharges')),
      fondoCeseL1: Number(formData.get('fondoCeseL1')),
      artPercentage: Number(formData.get('artPercentage')),
      inactivityFactor: Number(formData.get('inactivityFactor')),
      materialWaste: Number(formData.get('materialWaste')),
      financialTax: Number(formData.get('financialTax')),
      contingencyReserve: Number(formData.get('contingencyReserve')),
      lifeInsurance: Number(formData.get('lifeInsurance')),
      viviendaSqmCost: Number(formData.get('viviendaSqmCost')),
      edificioSqmCost: Number(formData.get('edificioSqmCost')),
      civilSqmCost: Number(formData.get('civilSqmCost')),
      industrialSqmCost: Number(formData.get('industrialSqmCost')),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(configRef, data, { merge: true });
    toast({ title: "Configuración Guardada", description: "Los cálculos de presupuesto usarán estos nuevos valores." });
  };

  const seedData = async () => {
    if (!firestore || !user) return;
    setIsSeeding(true);
    
    try {
      // 1. Crear Clientes
      const clientsRef = collection(firestore, 'clients');
      const client1 = await addDocumentNonBlocking(clientsRef, {
        name: "Desarrollos del Atlántico S.A.",
        cuit: "30-71542365-9",
        contactPerson: "Ing. Marcos Paz",
        email: "obras@atlantico.com",
        status: "ACTIVO",
        currentBalance: 0,
        creationDate: new Date().toISOString()
      });

      const client2 = await addDocumentNonBlocking(clientsRef, {
        name: "Consorcio Edificio Varesse",
        cuit: "33-54879621-4",
        contactPerson: "Arq. Lucía Mendez",
        email: "administracion@varesse.com",
        status: "ACTIVO",
        currentBalance: 0,
        creationDate: new Date().toISOString()
      });

      // 2. Crear Proyectos de ejemplo vinculados a los clientes creados
      const projectsRef = collection(firestore, 'projects');
      
      // Proyecto 1: Edificio Activo (Línea Base OK)
      const p1Amount = 540000000;
      const p1 = await addDocumentNonBlocking(projectsRef, {
        name: "Torre Maral 60 - Estructura",
        clientId: client1.id,
        type: "licitacion_privada",
        workType: "edificio_altura",
        surfaceSqm: 4500,
        totalBudgetAmount: p1Amount,
        currentStatus: "OK",
        location: "Av. Colón y la Costa, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 18,
        creationDate: new Date().toISOString(),
        startDate: new Date().toISOString()
      });

      // Aplicar contrato al cliente 1
      await addDocumentNonBlocking(collection(firestore, `clients/${client1.id}/transactions`), {
        type: 'CONTRATO',
        date: new Date().toISOString(),
        amount: p1Amount,
        remainingAmount: p1Amount,
        reference: `Contrato Obra: Torre Maral 60`,
        status: 'PENDIENTE',
        projectId: p1.id,
        creationDate: new Date().toISOString()
      });
      await updateDocumentNonBlocking(doc(firestore, 'clients', client1.id), { currentBalance: increment(p1Amount) });

      // Añadir items a P1
      const p1ItemsRef = collection(firestore, `projects/${p1.id}/budgetItems`);
      await addDocumentNonBlocking(p1ItemsRef, {
        name: "Hormigón Armado s/Plano",
        code: "EST-01",
        budgetedTotalAmount: 320000000,
        currentPhysicalProgressPercentage: 45,
        accumulatedActualCost: 155000000,
        resourceType: "material",
        projectId: p1.id
      });
      await addDocumentNonBlocking(p1ItemsRef, {
        name: "Mano de Obra Especializada",
        code: "MO-01",
        budgetedTotalAmount: 120000000,
        currentPhysicalProgressPercentage: 40,
        accumulatedActualCost: 52000000,
        resourceType: "labor",
        projectId: p1.id
      });

      // Proyecto 2: Licitación (Pendiente de Aprobación)
      const p2Amount = 185000000;
      await addDocumentNonBlocking(projectsRef, {
        name: "Nave Industrial Parque Ind.",
        clientId: client2.id,
        type: "licitacion_publica",
        workType: "industrial",
        surfaceSqm: 1200,
        totalBudgetAmount: p2Amount,
        currentStatus: "PENDIENTE_APROBACION",
        location: "Ruta 88 km 5, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 12,
        creationDate: new Date().toISOString()
      });

      // Proyecto 3: Obra en Alerta (Desvío de Costo real)
      const p3Amount = 42000000;
      const p3 = await addDocumentNonBlocking(projectsRef, {
        name: "Residencia Playa Grande",
        clientId: client1.id,
        type: "cliente_externo",
        workType: "vivienda_unifamiliar",
        surfaceSqm: 350,
        totalBudgetAmount: p3Amount,
        currentStatus: "ALERTA",
        location: "Calle Alem 3400, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 25,
        creationDate: new Date().toISOString()
      });

      // Aplicar contrato 2 al cliente 1
      await addDocumentNonBlocking(collection(firestore, `clients/${client1.id}/transactions`), {
        type: 'CONTRATO',
        date: new Date().toISOString(),
        amount: p3Amount,
        remainingAmount: p3Amount,
        reference: `Contrato Obra: Residencia Playa Grande`,
        status: 'PENDIENTE',
        projectId: p3.id,
        creationDate: new Date().toISOString()
      });
      await updateDocumentNonBlocking(doc(firestore, 'clients', client1.id), { currentBalance: increment(p3Amount) });

      const p3ItemsRef = collection(firestore, `projects/${p3.id}/budgetItems`);
      await addDocumentNonBlocking(p3ItemsRef, {
        name: "Terminaciones Revestimientos",
        code: "TER-05",
        budgetedTotalAmount: 12000000,
        currentPhysicalProgressPercentage: 10,
        accumulatedActualCost: 18000000, // Sobrecosto generado para la prueba
        resourceType: "material",
        projectId: p3.id
      });

      toast({ title: "Escenarios Generados", description: "Se han creado obras vinculadas a clientes reales con impacto financiero." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al poblar datos" });
    } finally {
      setIsSeeding(false);
    }
  };

  const calculateMultiplier = (vals: any) => {
    if (!vals) return 1.75;
    const attendance = (vals.attendanceBonus || 0) / 100;
    const social = (vals.socialCharges || 0) / 100;
    const cese = (vals.fondoCeseL1 || 0) / 100;
    const art = (vals.artPercentage || 0) / 100;
    const inactivity = (vals.inactivityFactor || 0) / 100;
    return (1 + attendance) * (1 + social + cese + art + inactivity);
  };

  const multiplier = calculateMultiplier(config);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Abriendo Sala de Máquinas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sala de Máquinas (Variables Globales)</h1>
            <p className="text-muted-foreground">Configura el motor de cálculo de costos y paramétricos m²</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-primary/30 text-primary" onClick={seedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar Escenarios Reales
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 bg-accent text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-black opacity-70">Multiplicador Real</CardTitle>
            <div className="text-4xl font-black">x{multiplier.toFixed(2)}</div>
            <CardDescription className="text-white/80 text-[10px] leading-tight mt-1">
              Factor de costo real empresa sobre el sueldo neto del operario.
            </CardDescription>
          </CardHeader>
        </Card>
        <div className="md:col-span-3 grid grid-cols-3 gap-2">
           <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Inactividad Proyectada</p>
            <p className="text-xl font-bold">{config?.inactivityFactor || 15}%</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Fondo Cese Laboral</p>
            <p className="text-xl font-bold">{config?.fondoCeseL1 || 12}%</p>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-primary">Costo Promedio Vivienda</p>
            <p className="text-xl font-bold">${(config?.viviendaSqmCost || 850000).toLocaleString()}/m²</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm uppercase tracking-wider">Convenio y Cargas (M.O.)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Básico Oficial (Hora)</Label>
                    <Input name="uocraBasic" type="number" step="0.01" defaultValue={config?.uocraBasic || 0} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Asistencia Perfecta (%)</Label>
                    <Input name="attendanceBonus" type="number" defaultValue={config?.attendanceBonus || 20} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Contribuciones (%)</Label>
                    <Input name="socialCharges" type="number" defaultValue={config?.socialCharges || 24} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fondo Cese (%)</Label>
                    <Input name="fondoCeseL1" type="number" defaultValue={config?.fondoCeseL1 || 12} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">ART (%)</Label>
                    <Input name="artPercentage" type="number" defaultValue={config?.artPercentage || 4} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Seg. Vida (Fijo $)</Label>
                    <Input name="lifeInsurance" type="number" defaultValue={config?.lifeInsurance || 500} />
                  </div>
                </div>
                <div className="pt-2">
                  <Label className="text-xs">Incidencia Inactividad (%)</Label>
                  <Input name="inactivityFactor" type="number" defaultValue={config?.inactivityFactor || 15} />
                  <p className="text-[9px] text-muted-foreground mt-1 italic">Previsión para días de lluvia y feriados pagados.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm uppercase tracking-wider">Indirectos y Riesgos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Desperdicio Materiales (%)</Label>
                  <Input name="materialWaste" type="number" defaultValue={config?.materialWaste || 5} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Impuesto Déb/Créd (%)</Label>
                  <Input name="financialTax" type="number" defaultValue={config?.financialTax || 2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Reserva de Contingencia (%)</Label>
                  <Input name="contingencyReserve" type="number" defaultValue={config?.contingencyReserve || 5} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm uppercase tracking-wider">Costos de Referencia por m²</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Valores para pre-presupuestación rápida en nuevas entradas.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Vivienda Unifamiliar ($/m²)</Label>
                    <Input name="viviendaSqmCost" type="number" defaultValue={config?.viviendaSqmCost || 850000} className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Edificio en Altura ($/m²)</Label>
                    <Input name="edificioSqmCost" type="number" defaultValue={config?.edificioSqmCost || 1200000} className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Obra Civil / Comercial ($/m²)</Label>
                    <Input name="civilSqmCost" type="number" defaultValue={config?.civilSqmCost || 950000} className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Nave Industrial ($/m²)</Label>
                    <Input name="industrialSqmCost" type="number" defaultValue={config?.industrialSqmCost || 750000} className="font-mono" />
                  </div>
                </div>
                <div className="p-3 bg-accent/5 rounded border border-accent/20 text-[10px] text-accent font-medium leading-relaxed">
                  Estos valores se utilizarán para auto-completar el monto objetivo al crear una nueva obra basándose en la superficie ingresada.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" className="gap-2 bg-primary">
            <Save className="w-4 h-4" /> Guardar Variables Globales
          </Button>
        </div>
      </form>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4 flex gap-4">
          <ShieldAlert className="w-6 h-6 text-orange-600 shrink-0" />
          <div className="text-xs text-orange-800 leading-tight">
            <p className="font-bold mb-1 uppercase tracking-tighter">Nota Técnica Importante</p>
            Al modificar estos valores, los presupuestos de **Licitaciones** se actualizarán en sus cálculos internos, pero las **Obras Activas** mantendrán el costo de línea base certificado al momento de su adjudicación para garantizar la trazabilidad financiera histórica.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
