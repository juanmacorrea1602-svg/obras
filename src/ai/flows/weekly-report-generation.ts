'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly project status report in Spanish.
 *
 * - generateWeeklyReport - A function that orchestrates the generation of the weekly report.
 * - WeeklyReportGenerationInput - The input type for the generateWeeklyReport function.
 * - WeeklyReportGenerationOutput - The return type for the generateWeeklyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Enum for overall project status
const ProjectStatusSchema = z.enum(['OK', 'PRECAUCION', 'ALERTA']).describe('Estado general del proyecto (OK, PRECAUCION, ALERTA).');
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Schema for a critical deviation item
const CriticalDeviationSchema = z.object({
  item: z.string().describe('Nombre del ítem o área donde se detectó el desvío.'),
  deviationDescription: z.string().describe('Descripción del desvío, incluyendo el porcentaje (ej: "+12% sobre presupuesto").'),
  cause: z.string().describe('Causa identificada del desvío.'),
  suggestedAction: z.string().describe('Acción sugerida para mitigar o corregir el desvío.'),
  isProblematic: z.boolean().describe('Indica si el desvío es problemático y requiere atención (true para Rojo/Amarillo, false para Verde).'),
}).describe('Representa un desvío crítico detectado en el proyecto.');
export type CriticalDeviation = z.infer<typeof CriticalDeviationSchema>;

// Input schema for the weekly report generation flow
const WeeklyReportGenerationInputSchema = z.object({
  projectName: z.string().describe('Nombre del proyecto.'),
  analystName: z.string().describe('Nombre del analista responsable del proyecto.'),
  reportStartDate: z.string().describe('Fecha de inicio del periodo del reporte (ej: "02 de Marzo").'),
  reportEndDate: z.string().describe('Fecha de fin del periodo del reporte (ej: "08 de Marzo").'),
  overallStatus: ProjectStatusSchema.describe('Estado general del proyecto.'),
  overallStatusReason: z.string().describe('Razón del estado general del proyecto (ej: "Debido a desvío en ítem Hormigón").'),
  physicalProgress: z.number().min(0).max(100).describe('Porcentaje de avance físico real del proyecto.'),
  plannedPhysicalProgress: z.number().min(0).max(100).describe('Porcentaje de avance físico planificado para la fecha.'),
  cpi: z.number().describe('Índice de Desempeño de Costos (CPI).'),
  projectedCashNeeds: z.number().describe('Necesidad de fondos proyectada para la próxima semana.'),
  criticalDeviations: z.array(CriticalDeviationSchema).max(3).describe('Lista de hasta 3 desvíos críticos del proyecto.'),
  estimatedFinalCostDeviationPercentage: z.number().describe('Desvío porcentual estimado del costo final de la obra respecto al presupuesto original (ej: 6.8).'),
  estimatedDeliveryDate: z.string().describe('Fecha de entrega estimada del proyecto (ej: "14 de Noviembre 2026").'),
  originalDeliveryDate: z.string().describe('Fecha de entrega original planificada (ej: "01 de Noviembre").'),
  administrativeTasks: z.array(z.string()).describe('Lista de tareas administrativas pendientes.'),
}).describe('Datos de entrada para generar el reporte semanal del proyecto.');
export type WeeklyReportGenerationInput = z.infer<typeof WeeklyReportGenerationInputSchema>;

// Internal schema for the prompt, with pre-processed values
const WeeklyReportPromptInputSchema = WeeklyReportGenerationInputSchema.extend({
  statusIcon: z.string(),
  delayValue: z.string(),
  formattedCpi: z.string(),
  cpiAlert: z.string(),
  formattedCashNeeds: z.string(),
  formattedFinalDeviation: z.string(),
  deviationDirection: z.string(),
});

// Output schema for the weekly report generation flow
const WeeklyReportGenerationOutputSchema = z.object({
  reportContent: z.string().describe('Contenido completo del reporte semanal generado en formato de texto.'),
}).describe('Contenido del reporte semanal del proyecto.');
export type WeeklyReportGenerationOutput = z.infer<typeof WeeklyReportGenerationOutputSchema>;

export async function generateWeeklyReport(input: WeeklyReportGenerationInput): Promise<WeeklyReportGenerationOutput> {
  return generateWeeklyReportFlow(input);
}

const weeklyReportGenerationPrompt = ai.definePrompt({
  name: 'weeklyReportGenerationPrompt',
  input: {schema: WeeklyReportPromptInputSchema},
  output: {schema: WeeklyReportGenerationOutputSchema},
  system: `Actuarás como un Arquitecto de Sistemas Expert en Control de Gestión de Obras (PMO). Tu especialidad es la trazabilidad financiera de proyectos de construcción bajo normas argentinas (UECARA/UOCRA). Tu objetivo es generar un reporte semanal detallado para stakeholders, que elimine la brecha entre el presupuesto teórico y el gasto real, permitiendo una visión de avance por ítem y por etapa.

Considera las siguientes premisas técnicas:
- Lógica de Unidades de Obra: El proyecto se desglosa en "Ítems" y "Etapas".
- Matemática de Avance: Utiliza el Método del Valor Ganado (EVM) para comparar avance físico contra costo real.
- Gestión de Insumos: Diferencia entre "Acopio vs. Consumo".

Instrucciones para generar el reporte:
1.  **Resumen Ejecutivo**:
    *   Comienza con la cabecera: "REPORTE DE ESTADO DE PROYECTO (Semana del {{{reportStartDate}}} al {{{reportEndDate}}})"
    *   Incluye "Proyecto: {{{projectName}}} | Analista responsable: {{{analystName}}}"
    *   Indica el "Estado General" con el símbolo adecuado y la razón del estado.
    *   Reporta el "Avance Físico Real" y el "Planificado", y calcula el "Retraso".
    *   Reporta la "Eficiencia de Costos (CPI)", explicando su significado y resaltando si es menor a 1.0. Si es menor a 1.0, enfatiza que es una "Alerta de sobrecosto".
    *   Reporta la "Caja Proyectada".

2.  **Análisis de Desvíos Críticos (Top 3)**:
    *   Presenta los desvíos recibidos. Para cada desvío, si 'isProblematic' es verdadero, precede el "Ítem" con "🔴 ALERTA: ".
    *   Detalla el "Desvío", la "Causa" y la "Acción sugerida".

3.  **Proyecciones**:
    *   Calcula y presenta el "Costo Final Estimado (EAC)", indicando el desvío porcentual respecto al presupuesto original.
    *   Presenta la "Fecha de Entrega Estimada" comparándola con la "Original".

4.  **Pendientes Administrativos (Tu \`To-Do\` List)**:
    *   Lista las tareas administrativas pendientes.

Asegúrate de que todo el contenido sea profesional, conciso y en español. Si el CPI general del proyecto es menor a 1.0, el reporte debe resaltar la gravedad de la situación.
`,
  prompt: `Genera el reporte semanal del proyecto con la siguiente información:

---
REPORTE DE ESTADO DE PROYECTO (Semana del {{{reportStartDate}}} al {{{reportEndDate}}})
Proyecto: {{{projectName}}} | Analista responsable: {{{analystName}}}

1. Resumen Ejecutivo (El "Flash" para el Dueño)
Estado General: {{{statusIcon}}} {{{overallStatus}}} ({{{overallStatusReason}}})

Avance Físico Real: {{{physicalProgress}}}% (Planificado: {{{plannedPhysicalProgress}}}% | Retraso: {{{delayValue}}}%)

Eficiencia de Costos (CPI): {{{cpi}}} (Por cada $1 invertido, estamos obteniendo \${{{formattedCpi}}} de valor. {{{cpiAlert}}})

Caja Proyectada: Necesidad de fondos para la próxima semana: \${{{formattedCashNeeds}}}

2. Análisis de Desvíos Críticos (Top {{criticalDeviations.length}})
{{#each criticalDeviations}}
{{#if isProblematic}}🔴 ALERTA: {{/if}}**Ítem**: {{{item}}}
**Desvío**: {{{deviationDescription}}}
**Causa**: {{{cause}}}
**Acción sugerida**: {{{suggestedAction}}}

{{/each}}

3. Proyecciones (Visión de Futuro)
Costo Final Estimado (EAC): Si mantenemos este ritmo, la obra terminará costando un {{{formattedFinalDeviation}}}% {{{deviationDirection}}} de lo presupuestado.

Fecha de Entrega Estimada: {{{estimatedDeliveryDate}}} (Original: {{{originalDeliveryDate}}})

4. Pendientes Administrativos (Tu \`To-Do\` List)
{{#each administrativeTasks}}
[ ] {{{this}}}
{{/each}}

El reporte debe estar listo para ser exportado a PDF y enviado por WhatsApp o Mail al Responsable de Finanzas.`
});

const generateWeeklyReportFlow = ai.defineFlow(
  {
    name: 'generateWeeklyReportFlow',
    inputSchema: WeeklyReportGenerationInputSchema,
    outputSchema: WeeklyReportGenerationOutputSchema,
  },
  async (input) => {
    // Pre-process variables for Handlebars
    const statusIcon = input.overallStatus === 'ALERTA' ? '🔴' : input.overallStatus === 'PRECAUCION' ? '🟡' : '🟢';
    const delayValue = (input.physicalProgress - input.plannedPhysicalProgress).toFixed(1);
    const formattedCpi = input.cpi.toFixed(2);
    const cpiAlert = input.cpi < 1.0 ? '🔴 Alerta de sobrecosto.' : '🟢 Dentro de lo esperado.';
    const formattedCashNeeds = input.projectedCashNeeds.toLocaleString('es-AR');
    const formattedFinalDeviation = Math.abs(input.estimatedFinalCostDeviationPercentage).toFixed(1);
    const deviationDirection = input.estimatedFinalCostDeviationPercentage > 0 ? 'más' : 'menos';

    const promptInput = {
      ...input,
      statusIcon,
      delayValue,
      formattedCpi,
      cpiAlert,
      formattedCashNeeds,
      formattedFinalDeviation,
      deviationDirection,
    };

    const {output} = await weeklyReportGenerationPrompt(promptInput);
    return output!;
  }
);
