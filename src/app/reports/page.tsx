
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOCK_PROJECTS } from '@/lib/mock-data';
import { FileText, Download, Send, Sparkles, Loader2 } from 'lucide-react';
import { generateWeeklyReport } from '@/ai/flows/weekly-report-generation';

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const project = MOCK_PROJECTS[0];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateWeeklyReport({
        projectName: project.name,
        analystName: project.analyst,
        reportStartDate: "02 de Marzo",
        reportEndDate: "08 de Marzo",
        overallStatus: "PRECAUCION",
        overallStatusReason: "Desvío en ítem Hormigón por inflación de insumo.",
        physicalProgress: 24.5,
        plannedPhysicalProgress: 26.0,
        cpi: 0.92,
        projectedCashNeeds: 4200000,
        criticalDeviations: [
          {
            item: "Estructura de Hormigón",
            deviationDescription: "+12% sobre presupuesto",
            cause: "Inflación de hormigón elaborado",
            suggestedAction: "Revisar acopio preventivo",
            isProblematic: true
          }
        ],
        estimatedFinalCostDeviationPercentage: 6.8,
        estimatedDeliveryDate: project.estimatedDeliveryDate,
        originalDeliveryDate: project.originalDeliveryDate,
        administrativeTasks: [
          "Validar facturas de Corralón X",
          "Carga de novedades UOCRA",
          "Conciliación bancaria"
        ]
      });
      setReport(result.reportContent);
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes de Gestión</h1>
          <p className="text-muted-foreground">Generación automática de estados de situación semanal</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2 bg-primary">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {generating ? "Generando..." : "Generar Reporte Semanal"}
        </Button>
      </div>

      {report ? (
        <Card className="shadow-lg border-primary">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reporte de Estado de Proyecto</CardTitle>
                <CardDescription>Semana del 02 al 08 de Marzo</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Send className="w-4 h-4" /> WhatsApp
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed">
              {report}
            </pre>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-xl bg-muted/10">
          <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground text-center max-w-xs">
            Haga clic en el botón superior para generar un reporte automatizado basado en los datos de ejecución y certificación.
          </p>
        </div>
      )}
    </div>
  );
}
