"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KPICard } from '@/components/dashboard/kpi-card';
import { AlertCircle, TrendingUp, TrendingDown, Clock, Package, Search, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const chartConfig = {
  Presupuesto: {
    label: "Presupuesto",
    color: "hsl(var(--primary))",
  },
  Real: {
    label: "Costo Real",
    color: "hsl(var(--destructive))",
  },
  Ganado: {
    label: "Valor Ganado",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user, firestore } = useFirebase();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  
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

  if (!mounted) return null;

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // Calculations
  const calculateMetrics = () => {
    if (!budgetItems || budgetItems.length === 0) return { cpi: 1, totalEV: 0, totalActual: 0, chartData: [] };

    let totalEV = 0;
    let totalActual = 0;
    
    const chartData = budgetItems.map(item => {
      const ev = (item.budgetedTotalAmount || 0) * ((item.currentPhysicalProgressPercentage || 0) / 100);
      const actual = item.accumulatedActualCost || 0;
      
      totalEV += ev;
      totalActual += actual;

      return {
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        Presupuesto: item.budgetedTotalAmount || 0,
        Real: actual,
        Ganado: ev
      };
    });

    const cpi = totalActual > 0 ? totalEV / totalActual : 1;

    return { cpi, totalEV, totalActual, chartData };
  };

  const { cpi, chartData } = calculateMetrics();
  const cpiStatus = cpi >= 1 ? 'good' : cpi > 0.9 ? 'caution' : 'alert';

  if (projectsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Cargando tablero de control...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Gestión</h1>
          <p className="text-muted-foreground mt-1">Análisis de Valor Ganado y Eficiencia Operativa</p>
        </div>
      </div>

      {/* Project Selector Card */}
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs uppercase font-bold text-primary">Seleccionar Obra para Análisis</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Elige una obra para ver sus métricas..." />
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
          <TrendingUp className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground text-center max-w-xs">
            Selecciona una obra para visualizar el estado financiero y el avance físico real.
          </p>
        </div>
      ) : budgetLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Procesando datos de obra...</p>
        </div>
      ) : (
        <>
          {/* KPI Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <KPICard 
              title="CPI (Eficiencia)" 
              value={cpi.toFixed(2)} 
              status={cpiStatus}
              description={cpi < 1 ? "Alerta de sobrecosto" : "Ahorro proyectado"}
              icon={TrendingUp}
              helpText="Índice de Desempeño de Costos. Mide la eficiencia financiera: >1 significa ahorro, <1 significa que se gastó más de lo presupuestado para el avance actual."
            />
            <KPICard 
              title="SPI (Plazos)" 
              value="---" 
              status="caution" 
              description="Pendiente de fechas"
              icon={Clock}
              helpText="Índice de Desempeño del Plazo. Compara el avance real contra el planificado. >1 indica obra adelantada, <1 indica retraso en el cronograma."
            />
            <KPICard 
              title="Estado Obra" 
              value={selectedProject?.currentStatus || "OK"} 
              status={selectedProject?.currentStatus === 'ALERTA' ? 'alert' : 'good'} 
              description="Salud General"
              icon={AlertCircle}
              helpText="Evaluación general de la salud del proyecto basada en desviaciones críticas detectadas en costos, tiempos y cumplimiento de etapas."
            />
            <KPICard 
              title="Presupuesto" 
              value={`$${(selectedProject?.totalBudgetAmount || 0).toLocaleString()}`} 
              status="good" 
              description="Monto Objetivo"
              icon={TrendingDown}
              helpText="Presupuesto total aprobado para la ejecución completa de la obra según el contrato y cómputos originales."
            />
            <KPICard 
              title="Avance Físico" 
              value={`${(chartData.reduce((acc, curr) => acc + (curr.Ganado / (curr.Presupuesto || 1)), 0) / (chartData.length || 1) * 100).toFixed(1)}%`}
              status="good" 
              description="Promedio Ítems"
              icon={Package}
              helpText="Porcentaje promedio ponderado de la ejecución real de todos los ítems de la obra certificados hasta la fecha."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-7">
            <Card className="col-span-4 shadow-sm border-border">
              <CardHeader>
                <CardTitle>Análisis por Ítem (EVM)</CardTitle>
                <CardDescription>Presupuesto vs. Real vs. Valor Ganado</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {chartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="Presupuesto" fill="var(--color-Presupuesto)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Real" fill="var(--color-Real)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Ganado" fill="var(--color-Ganado)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    Sin ítems de presupuesto cargados.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-3 shadow-sm border-border">
              <CardHeader>
                <CardTitle>Alertas de Desvío</CardTitle>
                <CardDescription>Ítems con CPI menor a 0.90</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetItems?.map((item) => {
                    const ev = (item.budgetedTotalAmount || 0) * ((item.currentPhysicalProgressPercentage || 0) / 100);
                    const actual = item.accumulatedActualCost || 0;
                    const itemCPI = actual > 0 ? ev / actual : 1;
                    
                    if (itemCPI >= 0.95 || actual === 0) return null;

                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Progreso: {item.currentPhysicalProgressPercentage}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-destructive">CPI: {itemCPI.toFixed(2)}</p>
                          <p className="text-[10px] text-destructive uppercase font-bold tracking-tighter">ALERTA CRÍTICA</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!budgetItems || budgetItems.every(i => (i.accumulatedActualCost === 0) || ((i.budgetedTotalAmount * (i.currentPhysicalProgressPercentage/100)) / i.accumulatedActualCost >= 0.95))) && (
                    <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                      <p className="text-xs">No se detectan desvíos críticos de costo en este momento.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
