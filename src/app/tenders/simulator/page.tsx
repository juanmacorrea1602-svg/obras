"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Calculator, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Pie, PieChart, Cell, Legend } from 'recharts';

const chartConfig = {
  ManoObra: { label: "Mano de Obra", color: "hsl(var(--primary))" },
  Materiales: { label: "Materiales", color: "hsl(var(--accent))" },
  Impuestos: { label: "Gastos/Impuestos", color: "hsl(var(--destructive))" },
  Beneficio: { label: "Beneficio Neto", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export default function TenderSimulatorPage() {
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);
  
  const [sqm, setSqm] = useState(100);
  const [laborHoursPerSqm, setLaborHoursPerSqm] = useState(40);
  const [materialsPerSqm, setMaterialsPerSqm] = useState(450000);
  const [desiredMargin, setDesiredMargin] = useState(15);

  useEffect(() => {
    setMounted(true);
  }, []);

  const configRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `user_profiles/${user.uid}/config/global`);
  }, [user, firestore]);

  const { data: config, isLoading } = useDoc(configRef);

  if (!mounted) return null;

  const calculateCosts = () => {
    const basic = config?.uocraBasic || 5000;
    const attendance = (config?.attendanceBonus || 20) / 100;
    const social = (config?.socialCharges || 24) / 100;
    const cese = (config?.fondoCeseL1 || 12) / 100;
    const art = (config?.artPercentage || 4) / 100;
    const inactivity = (config?.inactivityFactor || 15) / 100;
    const waste = (config?.materialWaste || 5) / 100;
    const financial = (config?.financialTax || 2) / 100;
    const contingency = (config?.contingencyReserve || 5) / 100;

    const multiplier = (1 + attendance) * (1 + social + cese + art + inactivity);
    const realHourlyCost = basic * multiplier;

    const totalLabor = sqm * laborHoursPerSqm * realHourlyCost;
    const totalMaterials = sqm * materialsPerSqm * (1 + waste);
    const indirects = (totalLabor + totalMaterials) * contingency;
    const taxes = (totalLabor + totalMaterials + indirects) * financial;
    
    const costTechnical = totalLabor + totalMaterials + indirects + taxes;
    const totalPrice = costTechnical / (1 - (desiredMargin / 100));
    const profit = totalPrice - costTechnical;

    const chartData = [
      { name: "ManoObra", value: totalLabor, fill: "var(--color-ManoObra)" },
      { name: "Materiales", value: totalMaterials, fill: "var(--color-Materiales)" },
      { name: "Impuestos", value: indirects + taxes, fill: "var(--color-Impuestos)" },
      { name: "Beneficio", value: profit, fill: "var(--color-Beneficio)" },
    ];

    return { totalLabor, totalMaterials, costTechnical, totalPrice, profit, chartData };
  };

  const results = calculateCosts();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Inicializando simulador financiero...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador de Preventa Rápida</h1>
        <p className="text-muted-foreground">Estimación de costos y precios de venta basada en variables globales</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm">Parámetros de Obra</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold">Superficie Total (m²)</Label>
                  <span className="text-lg font-bold text-primary">{sqm} m²</span>
                </div>
                <Slider value={[sqm]} max={2500} min={10} step={10} onValueChange={(v) => setSqm(v[0])} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold">Ratio Horas / m²</Label>
                  <span className="text-lg font-bold text-primary">{laborHoursPerSqm} hs</span>
                </div>
                <Slider value={[laborHoursPerSqm]} max={150} min={5} step={1} onValueChange={(v) => setLaborHoursPerSqm(v[0])} />
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold">Costo Materiales / m² ($)</Label>
                <Input type="number" value={materialsPerSqm} onChange={(e) => setMaterialsPerSqm(Number(e.target.value))} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold">Margen Deseado (%)</Label>
                  <span className="text-lg font-bold text-accent">{desiredMargin}%</span>
                </div>
                <Slider value={[desiredMargin]} max={50} min={0} step={1} onValueChange={(v) => setDesiredMargin(v[0])} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase">Base de Cálculo Aplicada</span>
              </div>
              <ul className="text-[10px] space-y-1 text-muted-foreground uppercase font-medium">
                <li>Básico: ${config?.uocraBasic || 0}</li>
                <li>Fondo Cese: {config?.fondoCeseL1 || 12}%</li>
                <li>Contingencia: {config?.contingencyReserve || 5}%</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardHeader className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Costo Técnico</p>
                <CardTitle className="text-xl">${results.costTechnical.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-primary text-white">
              <CardHeader className="p-4">
                <p className="text-[10px] font-bold uppercase text-white/70">Precio Sugerido</p>
                <CardTitle className="text-xl">${results.totalPrice.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-accent text-white">
              <CardHeader className="p-4">
                <p className="text-[10px] font-bold uppercase text-white/70">Beneficio Neto</p>
                <CardTitle className="text-xl">${results.profit.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Composición del Precio</CardTitle>
                <CardDescription>Desglose por rubros</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <PieChart>
                    <Pie
                      data={results.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {results.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Sensibilidad</CardTitle>
                <CardDescription>Ratios por m²</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo MO / m²:</span>
                    <span className="font-bold">${(results.totalLabor / sqm).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo Materiales / m²:</span>
                    <span className="font-bold">${(results.totalMaterials / sqm).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-black text-primary">
                    <span>Precio Oferta / m²:</span>
                    <span>${(results.totalPrice / sqm).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
