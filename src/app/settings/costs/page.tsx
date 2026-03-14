"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { HardHat, ShieldAlert, Loader2, Save, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GlobalCostsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const configRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `user_profiles/${user.uid}/config/global`);
  }, [user, firestore]);

  const { data: config, isLoading } = useDoc(configRef);

  if (!mounted) return null;

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
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(configRef, data, { merge: true });
    toast({ title: "Configuración Guardada", description: "Los cálculos de presupuesto usarán estos nuevos valores." });
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sala de Máquinas (Variables Globales)</h1>
          <p className="text-muted-foreground">Configura el motor de cálculo de costos UOCRA/UECARA</p>
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
        <div className="md:col-span-3 grid grid-cols-2 gap-2">
           <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Inactividad Proyectada</p>
            <p className="text-xl font-bold">{config?.inactivityFactor || 15}%</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Fondo Cese Laboral</p>
            <p className="text-xl font-bold">{config?.fondoCeseL1 || 12}%</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
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
                <p className="text-[9px] text-muted-foreground mt-1 italic">"Colchón" de seguridad para imprevistos técnicos.</p>
              </div>
            </CardContent>
          </Card>
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
