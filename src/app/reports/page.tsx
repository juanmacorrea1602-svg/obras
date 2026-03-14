
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Download, Send, Sparkles, Loader2, Search, AlertCircle, FileCheck } from 'lucide-react';
import { generateWeeklyReport } from '@/ai/flows/weekly-report-generation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Queries
  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('responsibleAnalystId', '==', user.uid),
      where('currentStatus', 'in', ['OK', 'ALERTA'])
    );
  }, [user, firestore]);

  const budgetItemsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedProjectId) return null;
    return collection(firestore, `projects/${selectedProjectId}/budgetItems`);
  }, [firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: budgetItems, isLoading: budgetLoading } = useCollection(budgetItemsQuery);

  if (!mounted) return null;

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleGenerate = async () => {
    if (!selectedProject || !budgetItems) return;

    setGenerating(true);
    setReport(null);

    try {
      // 1. Calcular métricas reales (Valor Ganado)
      let totalBudget = 0;
      let totalEV = 0;
      let totalAC = 0;
      const criticalDeviations: any[] = [];

      budgetItems.forEach(item => {
        const itemBudget = item.budgetedTotalAmount || 0;
        const itemProgress = (item.currentPhysicalProgressPercentage || 0) / 100;
        const itemAC = item.accumulatedActualCost || 0;
        const itemEV = itemBudget * itemProgress;

        totalBudget += itemBudget;
        totalEV += itemEV;
        totalAC += itemAC;

        // Identificar desvíos (CPI < 0.9)
        const itemCPI = itemAC > 0 ? itemEV / itemAC : 1;
        if (itemCPI < 0.9 && itemAC > 0) {
          criticalDeviations.push({
            item: item.name,
            deviationDescription: `${((1 - itemCPI) * 100).toFixed(1)}% sobre costo`,
            cause: "Desvío detectado en análisis de costos e insumos.",
            suggestedAction: "Revisar rendimientos de cuadrilla y precios de compra.",
            isProblematic: true
          });
        }
      });

      const overallCPI = totalAC > 0 ? totalEV / totalAC : 1;
      const physicalProgress = totalBudget > 0 ? (totalEV / totalBudget) * 100 : 0;
      
      // Proyección de desvío final (EAC)
      const estimatedFinalCost = overallCPI > 0 ? totalBudget / overallCPI : totalBudget;
      const finalDeviationPercentage = totalBudget > 0 ? ((estimatedFinalCost - totalBudget) / totalBudget) * 100 : 0;

      const result = await generateWeeklyReport({
        projectName: selectedProject.name,
        analystName: user?.displayName || "Analista Responsable",
        reportStartDate: format(subDays(new Date(), 7), "dd 'de' MMMM", { locale: es }),
        reportEndDate: format(new Date(), "dd 'de' MMMM", { locale: es }),
        overallStatus: overallCPI < 0.9 ? "ALERTA" : overallCPI < 1 ? "PRECAUCION" : "OK",
        overallStatusReason: overallCPI < 1 
          ? `Eficiencia de costos por debajo del objetivo (${overallCPI.toFixed(2)}).` 
          : "Ejecución dentro de los parámetros presupuestarios.",
        physicalProgress: Number(physicalProgress.toFixed(1)),
        plannedPhysicalProgress: Number(physicalProgress.toFixed(1)), // SPI simplificado
        cpi: Number(overallCPI.toFixed(2)),
        projectedCashNeeds: totalBudget * 0.05, // Estimación del 5% del presupuesto para la semana
        criticalDeviations: criticalDeviations.slice(0, 3),
        estimatedFinalCostDeviationPercentage: Number(finalDeviationPercentage.toFixed(1)),
        estimatedDeliveryDate: selectedProject.plannedEndDate ? format(new Date(selectedProject.plannedEndDate), "dd 'de' MMMM yyyy", { locale: es }) : "Pendiente",
        originalDeliveryDate: selectedProject.plannedEndDate ? format(new Date(selectedProject.plannedEndDate), "dd 'de' MMMM", { locale: es }) : "---",
        administrativeTasks: [
          "Conciliar facturas pendientes del periodo.",
          "Cargar novedades de jornales UOCRA.",
          "Verificar stock de materiales críticos."
        ]
      });

      setReport(result.reportContent);
      toast({
        title: "Reporte Generado",
        description: "La IA ha procesado los datos de la obra con éxito.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el reporte automatizado.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Gestión</h1>
          <p className="text-muted-foreground">Generación automática de estados de situación mediante IA Genkit</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-2 w-full">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                <Search className="w-3 h-3" /> Seleccionar Obra para Reportar
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={projectsLoading ? "Cargando obras..." : "Elige una obra activa..."} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={generating || !selectedProjectId || budgetLoading} 
              className="gap-2 bg-primary h-10 w-full md:w-auto"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Procesando Datos..." : "Generar con IA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10 text-center p-8">
          <FileText className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground font-medium">Selecciona una obra activa para comenzar.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs">
            La IA analizará el Valor Ganado (EV), los costos reales (AC) y los desvíos técnicos para redactar el reporte automáticamente.
          </p>
        </div>
      ) : generating ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-bold animate-pulse">Analizando finanzas de la obra...</p>
            <p className="text-sm text-muted-foreground">Calculando CPI, desvíos de ítems y proyecciones de entrega.</p>
          </div>
        </div>
      ) : report ? (
        <Card className="shadow-lg border-primary/50 border-2 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="border-b bg-primary/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" /> Reporte de Estado de Proyecto
              </CardTitle>
              <CardDescription>Generado el {format(new Date(), "PPpp", { locale: es })}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-background">
                <Download className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-background">
                <Send className="w-4 h-4" /> Enviar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            <div className="bg-white p-6 md:p-10 rounded-lg border shadow-inner">
              <pre className="whitespace-pre-wrap font-body text-sm md:text-base leading-relaxed text-foreground">
                {report}
              </pre>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-4 flex justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> Reporte generado por motor de IA - Verifique los datos antes de enviar
            </p>
          </CardFooter>
        </Card>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/5 text-center p-8">
          <Sparkles className="w-8 h-8 text-primary opacity-40 mb-2" />
          <p className="text-sm text-muted-foreground">Obra seleccionada: <span className="font-bold text-foreground">{selectedProject?.name}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Haz clic en "Generar con IA" para redactar el estado de situación.</p>
        </div>
      )}
    </div>
  );
}
