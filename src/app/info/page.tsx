'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, ShieldAlert, Scale, HardHat, FileText, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InfoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Normativas y Regulaciones</h1>
        <p className="text-muted-foreground">Base de conocimiento legal y técnica para el Control de Gestión de Obras.</p>
      </div>

      <Tabs defaultValue="cct" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="cct" className="gap-2"><Gavel className="h-4 w-4" /> Convenios (CCT)</TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-2"><ShieldAlert className="h-4 w-4" /> Seguridad e Higiene</TabsTrigger>
          <TabsTrigger value="jurisdiccion" className="gap-2"><Globe className="h-4 w-4" /> Jurisdicción</TabsTrigger>
        </TabsList>

        <TabsContent value="cct">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> UOCRA (CCT 76/75)
                  </CardTitle>
                  <Badge variant="outline">Mano de Obra Directa</Badge>
                </div>
                <CardDescription>Régimen laboral de la construcción para obreros y ayudantes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <p><strong>Art. 18 (Asistencia):</strong> 20% adicional sobre el básico por puntualidad y asistencia perfecta.</p>
                  <p><strong>Fondo de Cese Laboral (Ley 22.250):</strong> Reemplaza la indemnización por despido. 12% el primer año, 8% el segundo.</p>
                  <p><strong>Zona A (CABA/Prov. BA):</strong> Salario básico sin recargo por zona desfavorable.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> UECARA (CCT 660/13)
                  </CardTitle>
                  <Badge variant="outline">Personal Técnico/Adm.</Badge>
                </div>
                <CardDescription>Convenio para capataces, administrativos y técnicos de obra.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <p><strong>Régimen Mensualizado:</strong> A diferencia de UOCRA, el pago es por mes calendario.</p>
                  <p><strong>Adicional por Título:</strong> Bonificación porcentual según formación técnica habilitante.</p>
                  <p><strong>Movilidad:</strong> Compensación por gastos de traslado a pie de obra.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seguridad">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" /> Ley 19.587 y Dec. 911/96
              </CardTitle>
              <CardDescription>Marco regulatorio de Seguridad e Higiene en la industria de la construcción.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-4 text-sm">
                  <section>
                    <h4 className="font-bold uppercase text-xs text-primary mb-2">Elementos de Protección Personal (EPP)</h4>
                    <p>Es obligación del empleador proveer: casco, calzado de seguridad (borceguíes con puntera), protección ocular y guantes según la tarea. La omisión de entrega genera responsabilidad civil y multas de la SRT.</p>
                  </section>
                  <section>
                    <h4 className="font-bold uppercase text-xs text-primary mb-2">Programas de Seguridad</h4>
                    <p>Toda obra con demolición o excavación mayor a 1.20m debe presentar un programa de seguridad ante la ART. La falta de este documento detiene la cobertura en caso de siniestro.</p>
                  </section>
                  <section>
                    <h4 className="font-bold uppercase text-xs text-primary mb-2">Cartelería Obligatoria</h4>
                    <p>Identificación de obra con datos de la empresa, ART, dirección y matrícula del responsable técnico.</p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jurisdiccion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" /> Regulaciones por Jurisdicción
              </CardTitle>
              <CardDescription>Tasas, derechos de construcción y normativas municipales vigentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-bold text-sm mb-2">Municipio de General Pueyrredón (Mar del Plata)</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Derecho de Construcción: Calculado sobre m2 de superficie cubierta.</li>
                    <li>Ordenanza de Ruidos Molestos: Horarios de trabajo de 08:00 a 18:00 hs.</li>
                    <li>Ocupación de Vía Pública: Permisos para volquetes y vallado de obra.</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-bold text-sm mb-2">Otras Jurisdicciones (PBA)</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Código de Edificación Provincial: Estándares de habitabilidad y retiros mínimos.</li>
                    <li>Visados de Colegios Profesionales: CAMDP (Arquitectura) y Distrito II (Ingeniería).</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
