
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment, getDocs } from 'firebase/firestore';
import { HardHat, ShieldAlert, Loader2, Save, Calculator, Layers, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GlobalCostsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

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

  const handlePurge = async () => {
    if (!firestore || !user) return;
    
    const confirmReset = window.confirm(
      "¿ESTÁ SEGURO QUE DESEA RESETEAR LA PLATAFORMA?\n\n" +
      "Esta acción realizará un barrido total de:\n" +
      "- Todas las Obras (Activas, Licitaciones y Pendientes)\n" +
      "- Toda la cartera de Clientes y sus estados de cuenta\n" +
      "- Todos los Legajos de Personal y Documentación\n" +
      "- Gastos, Certificaciones y Transacciones financieras\n\n" +
      "La configuración de costos maestros se mantendrá. Esta acción no se puede deshacer."
    );

    if (!confirmReset) return;

    setIsPurging(true);
    try {
      const rootCollections = ['clients', 'projects', 'hr_files', 'suppliers', 'payment_orders'];
      
      for (const colName of rootCollections) {
        const colRef = collection(firestore, colName);
        const snapshot = await getDocs(colRef);
        
        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id;
          const rootDocRef = doc(firestore, colName, docId);
          
          // Mapeo exhaustivo de subcolecciones para limpieza profunda
          const subcollections: Record<string, string[]> = {
            'projects': ['budgetItems', 'stages', 'expenses', 'physicalProgressEntries', 'documents'],
            'clients': ['transactions', 'documents'],
            'hr_files': ['documents']
          };

          // Primero limpiamos las "hojas" (subcolecciones)
          if (subcollections[colName]) {
            for (const sub of subcollections[colName]) {
              const subColPath = `${colName}/${docId}/${sub}`;
              const subSnap = await getDocs(collection(firestore, subColPath));
              subSnap.forEach(s => {
                // Borrado no bloqueante de cada documento hijo
                deleteDocumentNonBlocking(doc(firestore, subColPath, s.id));
              });
            }
          }
          
          // Finalmente borramos el documento raíz (después de disparar el borrado de sus hijos)
          deleteDocumentNonBlocking(rootDocRef);
        }
      }
      
      toast({ 
        title: "Reseteo de Fábrica Completado", 
        description: "Se han eliminado todos los registros. La base de datos está en blanco." 
      });
    } catch (e) {
      console.error("Purge error:", e);
      toast({ variant: "destructive", title: "Error en Limpieza", description: "Algunos registros no pudieron ser eliminados." });
    } finally {
      setIsPurging(false);
    }
  };

  const seedData = () => {
    if (!firestore || !user) return;
    setIsSeeding(true);
    
    try {
      // --- ESCENARIO 1: DESARROLLADORA (OBRA ACTIVA CON EVM) ---
      const client1Ref = doc(collection(firestore, 'clients'));
      const c1Id = client1Ref.id;
      const p1Ref = doc(collection(firestore, 'projects'));
      const p1Id = p1Ref.id;
      const p1Amount = 540000000;

      // 1. Crear Cliente
      setDocumentNonBlocking(client1Ref, {
        name: "Desarrollos del Atlántico S.A.",
        cuit: "30-71542365-9",
        contactPerson: "Ing. Marcos Paz",
        email: "obras@atlantico.com",
        status: "ACTIVO",
        currentBalance: p1Amount,
        creationDate: new Date().toISOString()
      }, { merge: true });

      // 2. Crear Obra Vinculada
      setDocumentNonBlocking(p1Ref, {
        name: "Torre Maral 60 - Estructura",
        clientId: c1Id,
        type: "licitacion_privada",
        workType: "edificio_altura",
        surfaceSqm: 4500,
        totalBudgetAmount: p1Amount,
        currentStatus: "OK",
        location: "Av. Colón y la Costa, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 18,
        creationDate: new Date().toISOString(),
        startDate: new Date().toISOString(),
        costConfig: {
          artPercentage: config?.artPercentage || 4,
          fondoCese: config?.fondoCeseL1 || 12
        }
      }, { merge: true });

      // 3. Registrar Contrato en Cuenta Corriente del Cliente
      setDocumentNonBlocking(doc(collection(firestore, `clients/${c1Id}/transactions`)), {
        type: 'CONTRATO',
        date: new Date().toISOString(),
        amount: p1Amount,
        remainingAmount: p1Amount,
        reference: `Contrato Obra: Torre Maral 60`,
        status: 'PENDIENTE',
        projectId: p1Id,
        creationDate: new Date().toISOString()
      }, { merge: true });

      // 4. Cargar Ítems de Presupuesto para el Dashboard
      const budget1Ref = doc(collection(firestore, `projects/${p1Id}/budgetItems`));
      setDocumentNonBlocking(budget1Ref, {
        name: "Hormigón Armado s/Plano",
        code: "EST-01",
        budgetedTotalAmount: 320000000,
        currentPhysicalProgressPercentage: 45,
        accumulatedActualCost: 155000000,
        resourceType: "material",
        projectId: p1Id,
        responsibleAnalystId: user.uid
      }, { merge: true });

      const budget2Ref = doc(collection(firestore, `projects/${p1Id}/budgetItems`));
      setDocumentNonBlocking(budget2Ref, {
        name: "Mano de Obra Especializada",
        code: "MO-01",
        budgetedTotalAmount: 120000000,
        currentPhysicalProgressPercentage: 40,
        accumulatedActualCost: 52000000,
        resourceType: "labor",
        projectId: p1Id,
        responsibleAnalystId: user.uid
      }, { merge: true });

      // --- ESCENARIO 2: OBRA EN ALERTA (SOBRECOSTO) ---
      const client2Ref = doc(collection(firestore, 'clients'));
      const c2Id = client2Ref.id;
      const p2Ref = doc(collection(firestore, 'projects'));
      const p2Id = p2Ref.id;

      setDocumentNonBlocking(client2Ref, {
        name: "Fiduciaria Playa Grande",
        cuit: "30-55443322-1",
        contactPerson: "Arq. Estela Mares",
        status: "ACTIVO",
        currentBalance: 85000000,
        creationDate: new Date().toISOString()
      }, { merge: true });

      setDocumentNonBlocking(p2Ref, {
        name: "Residencia Playa Grande - Terminaciones",
        clientId: c2Id,
        type: "cliente_externo",
        totalBudgetAmount: 85000000,
        currentStatus: "ALERTA",
        location: "Barrio Los Troncos, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 15,
        creationDate: new Date().toISOString()
      }, { merge: true });

      // Ítem con alerta de CPI
      setDocumentNonBlocking(doc(collection(firestore, `projects/${p2Id}/budgetItems`)), {
        name: "Pintura y Revestimientos",
        code: "TERM-05",
        budgetedTotalAmount: 12000000,
        currentPhysicalProgressPercentage: 20,
        accumulatedActualCost: 8500000, // Sobrecosto masivo
        resourceType: "material",
        projectId: p2Id,
        responsibleAnalystId: user.uid
      }, { merge: true });

      // --- ESCENARIO 3: LICITACIÓN PENDIENTE ---
      const p3Ref = doc(collection(firestore, 'projects'));
      setDocumentNonBlocking(p3Ref, {
        name: "Nave Industrial Parque Industrial Savio",
        type: "licitacion_publica",
        totalBudgetAmount: 1250000000,
        currentStatus: "LICITACION",
        location: "Ruta 88, MDP",
        responsibleAnalystId: user.uid,
        marginPercentage: 12,
        creationDate: new Date().toISOString()
      }, { merge: true });

      toast({ 
        title: "Escenarios Reales Listos", 
        description: "Se han generado Clientes, Obras y movimientos financieros vinculados." 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Fallo al poblar datos de prueba." });
    } finally {
      setIsSeeding(false);
    }
  };

  const multiplier = config ? (1 + (config.attendanceBonus || 20) / 100) * (1 + (config.socialCharges || 24) / 100 + (config.fondoCeseL1 || 12) / 100 + (config.artPercentage || 4) / 100 + (config.inactivityFactor || 15) / 100) : 1.75;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Accediendo a la Sala de Máquinas...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Sala de Máquinas</h1>
            <p className="text-muted-foreground">Motor de cálculo y gestión de datos maestros del sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5" 
            onClick={handlePurge} 
            disabled={isPurging || isSeeding}
          >
            {isPurging ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Limpiar Entorno (Reset)
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 border-primary/30 text-primary" 
            onClick={seedData} 
            disabled={isSeeding || isPurging}
          >
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
            <CardDescription className="text-white/80 text-[10px] mt-1 leading-tight">
              Factor de costo real empresa sobre sueldo neto del operario (Inc. Cargas y ART).
            </CardDescription>
          </CardHeader>
        </Card>
        <div className="md:col-span-3 grid grid-cols-3 gap-2">
           <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Inactividad</p>
            <p className="text-xl font-bold">{config?.inactivityFactor || 15}%</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Fondo Cese</p>
            <p className="text-xl font-bold">{config?.fondoCeseL1 || 12}%</p>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-primary">Ref. Vivienda</p>
            <p className="text-xl font-bold">${(config?.viviendaSqmCost || 850000).toLocaleString()}/m²</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-primary" /> Convenio UOCRA y Cargas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Básico Oficial (Hora)</Label>
                    <Input name="uocraBasic" type="number" step="0.01" defaultValue={config?.uocraBasic || 0} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Asistencia Art. 18 (%)</Label>
                    <Input name="attendanceBonus" type="number" defaultValue={config?.attendanceBonus || 20} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Contribuciones (%)</Label>
                    <Input name="socialCharges" type="number" defaultValue={config?.socialCharges || 24} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Fondo Cese (%)</Label>
                    <Input name="fondoCeseL1" type="number" defaultValue={config?.fondoCeseL1 || 12} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Alícuota ART (%)</Label>
                    <Input name="artPercentage" type="number" defaultValue={config?.artPercentage || 4} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Coef. Inactividad (%)</Label>
                    <Input name="inactivityFactor" type="number" defaultValue={config?.inactivityFactor || 15} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Costos de Referencia m²
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Vivienda Unifamiliar Estándar ($/m²)</Label>
                    <Input name="viviendaSqmCost" type="number" defaultValue={config?.viviendaSqmCost || 850000} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Edificio en Altura (Estructura) ($/m²)</Label>
                    <Input name="edificioSqmCost" type="number" defaultValue={config?.edificioSqmCost || 1200000} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold">Nave Industrial ($/m²)</Label>
                    <Input name="industrialSqmCost" type="number" defaultValue={config?.industrialSqmCost || 750000} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2 bg-primary">
            <Save className="w-4 h-4" /> Guardar Configuración Maestra
          </Button>
        </div>
      </form>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4 flex gap-4">
          <ShieldAlert className="w-6 h-6 text-orange-600 shrink-0" />
          <div className="text-xs text-orange-800 leading-tight">
            <p className="font-bold mb-1 uppercase tracking-tighter">Advertencia de Seguridad</p>
            Al presionar "Limpiar Entorno", el sistema ejecutará un borrado profundo de todos los datos transaccionales. Utilice esta función para resetear la plataforma antes de comenzar la carga real de su empresa. La configuración de costos cargada arriba **NO** será eliminada.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
