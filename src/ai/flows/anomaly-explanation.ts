'use server';
/**
 * @fileOverview A Genkit flow for detecting financial anomalies in construction projects.
 *
 * - anomalyExplanation - A function that processes item-specific financial data and provides anomaly detection, explanation, and suggested actions.
 * - AnomalyExplanationInput - The input type for the anomalyExplanation function.
 * - AnomalyExplanationOutput - The return type for the anomalyExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Enumerations for clarity
const ResourceTypeSchema = z.enum([
  'Materiales',
  'Mano de Obra',
  'Equipos/Varios',
  'General',
]);

const AnomalyExplanationInputSchema = z.object({
  projectName: z.string().describe('El nombre del proyecto de construcción.'),
  itemId: z.string().describe('El identificador único del ítem de la obra.'),
  itemName: z.string().describe('El nombre descriptivo del ítem (ej: Mampostería de ladrillo hueco del 12).'),
  itemStage: z.string().describe('El nombre de la etapa del proyecto a la que pertenece el ítem.'),
  budgetedAmount: z.number().min(0).describe('El monto total presupuestado para este ítem.'),
  accumulatedCost: z.number().min(0).describe('El costo real acumulado para este ítem hasta la fecha.'),
  physicalProgressPercentage: z.number().min(0).max(100).describe('El porcentaje de avance físico real de este ítem (0-100).'),
  plannedProgressPercentage: z.number().min(0).max(100).describe('El porcentaje de avance físico planificado para este ítem a la fecha actual (0-100).'),
  latestTransaction: z.object({
    transactionType: ResourceTypeSchema.describe('El tipo de recurso del último gasto registrado.'),
    amount: z.number().min(0).describe('El monto total del último gasto.'),
    unitPrice: z.number().optional().describe('El precio unitario del último gasto (si aplica para materiales/mano de obra).'),
    quantity: z.number().optional().describe('La cantidad del recurso del último gasto (si aplica para materiales/mano de obra).'),
    unit: z.string().optional().describe('La unidad de medida del recurso (si aplica).'),
    isAcopio: z.boolean().optional().describe('Indica si el material está en acopio (true) o ya consumido (false). Solo para tipo Materiales.'),
    supplier: z.string().optional().describe('El nombre del proveedor o subcontratista.'),
    documentRef: z.string().optional().describe('Referencia del documento respaldatorio (factura, remito).'),
  }).optional().describe('Detalles de la última transacción de gasto, si se está evaluando un gasto reciente.'),
  budgetedUnitPrice: z.number().optional().describe('El precio unitario presupuestado para este ítem o recurso, si aplica.'),
  unitPriceAlertThreshold: z.number().min(0).max(1).default(0.05).describe('Umbral de desviación porcentual para alertar sobre inflación de precios (ej. 0.05 para 5%).'),
  overBudgetAlertThreshold: z.number().min(0).max(1).default(0.9).describe('Umbral porcentual del presupuesto del ítem a partir del cual se considera un riesgo de sobrecosto (ej. 0.9 para 90%).'),
  projectCPI: z.number().optional().describe('El Índice de Desempeño de Costos (CPI) global del proyecto, para contexto.'),
  projectSPI: z.number().optional().describe('El Índice de Desempeño del Plazo (SPI) global del proyecto, para contexto.'),
});

export type AnomalyExplanationInput = z.infer<typeof AnomalyExplanationInputSchema>;

const AnomalyExplanationOutputSchema = z.object({
  statusColor: z.enum(['Rojo', 'Amarillo', 'Verde']).describe('Color de estado general: Rojo (crítico), Amarillo (precaución), Verde (bien).'),
  executiveSummary: z.string().describe('Un resumen ejecutivo conciso del estado del ítem y los principales desvíos.'),
  detailedAnalysis: z.string().describe('Un análisis más detallado de los desvíos detectados, sus posibles causas y lógica aplicada.'),
  alerts: z.array(z.string()).describe('Lista de alertas específicas detectadas (ej: "Gasto fuera de presupuesto", "Inflación de ítem").'),
  suggestedActions: z.array(z.string()).describe('Lista de acciones sugeridas para miitigar los problemas o mejorar el rendimiento.'),
});

export type AnomalyExplanationOutput = z.infer<typeof AnomalyExplanationOutputSchema>;

export async function anomalyExplanation(input: AnomalyExplanationInput): Promise<AnomalyExplanationOutput> {
  return anomalyExplanationFlow(input);
}

const anomalyExplanationPrompt = ai.definePrompt({
  name: 'anomalyExplanationPrompt',
  input: { schema: AnomalyExplanationInputSchema },
  output: { schema: AnomalyExplanationOutputSchema },
  prompt: `Actuarás como un Arquitecto de Sistemas Experto en Control de Gestión de Obras (PMO), especializado en trazabilidad financiera de proyectos de construcción bajo normas argentinas (UECARA/UOCRA). Tu objetivo es detectar desvíos entre el presupuesto teórico y el gasto real, y entre el costo acumulado y el avance físico, para un ítem específico de una obra. Debes proporcionar una explicación concisa de la causa y sugerir acciones. Tu análisis debe ser objetivo, basado en los datos proporcionados y las mejores prácticas de control de proyectos.

**Contexto del Ítem y Datos Clave:**
*   **Proyecto:** {{{projectName}}}
*   **Ítem:** {{{itemName}}} (ID: {{{itemId}}}), Etapa: {{{itemStage}}}
*   **Presupuesto Asignado:** \${{{budgetedAmount}}}
*   **Costo Acumulado Actual:** \${{{accumulatedCost}}}
*   **Avance Físico Real:** {{{physicalProgressPercentage}}}%
*   **Avance Físico Planificado a la Fecha:** {{{plannedProgressPercentage}}}%

**Consideraciones y Lógica de Análisis:**

1.  **Análisis de Costo vs. Avance Físico (CPI del Ítem):**
    *   Calcula el **Valor Ganado (EV)**: (Presupuesto Asignado al Ítem * (Avance Físico Real / 100)).
    *   Calcula el **Índice de Desempeño de Costos del Ítem (CPI_item)**: EV / Costo Acumulado Actual.
    *   Si CPI_item es < 0.9: **Rojo** (desvío crítico de costo).
    *   Si CPI_item está entre 0.9 y 1.0: **Amarillo** (precaución por sobrecosto o ineficiencia).
    *   Si CPI_item >= 1.0: **Verde** (eficiente o en presupuesto respecto al avance).

2.  **Análisis de Avance del Plazo (SPI del Ítem - simplificado):**
    *   Compara el Avance Físico Real con el Avance Físico Planificado a la Fecha.
    *   Si Avance Físico Real < Avance Físico Planificado - 5: **Amarillo** (posible retraso).
    *   Si Avance Físico Real < Avance Físico Planificado - 10: **Rojo** (retraso significativo).

3.  **Análisis de Riesgo de Sobrepresupuesto del Ítem:**
    *   Si el Costo Acumulado Actual > (Presupuesto Asignado * {{{overBudgetAlertThreshold}}}): **Amarillo/Rojo** (riesgo inminente de exceder el presupuesto del ítem).

4.  **Análisis de Inflación de Precios (última transacción, si disponible):**
    *   Si se proporciona un objeto \`latestTransaction\` con \`unitPrice\` y \`budgetedUnitPrice\` está presente:
        *   Calcula la **Desviación Porcentual de Precio**: ((latestTransaction.unitPrice - budgetedUnitPrice) / budgetedUnitPrice).
        *   Si Desviación Porcentual de Precio > {{{unitPriceAlertThreshold}}}: **Rojo** (inflación de ítem significativa).
        *   Si Desviación Porcentual de Precio está entre ({{{unitPriceAlertThreshold}}} / 2) y {{{unitPriceAlertThreshold}}}: **Amarillo** (inflación de ítem moderada).
    *   **Consideración de Acopio**: Si \`latestTransaction.isAcopio\` es true y \`latestTransaction.transactionType\` es 'Materiales': "Este gasto se suma al costo financiero pero no aún al avance físico del ítem."

5.  **Generación de la Respuesta (Formato JSON):**
    *   **statusColor**: Determina el color final basado en la anomalía más severa detectada. Si hay alguna condición de "Rojo", el color es "Rojo". Si hay alguna "Amarillo" y no "Rojo", el color es "Amarillo". De lo contrario, "Verde".
    *   **executiveSummary**: Un párrafo conciso que resume el estado y los problemas principales.
    *   **detailedAnalysis**: Explicación detallada de los cálculos, desvíos y lógica que llevó a las conclusiones.
    *   **alerts**: Lista de frases cortas de alerta, sin redundancia con el resumen ejecutivo. Por ejemplo, "Desvío crítico en Costo vs. Avance Físico."
    *   **suggestedActions**: Lista de acciones concretas y prácticas para mitigar o corregir los problemas.

**Ahora, genera el JSON de salida basándote en el input proporcionado y esta lógica de análisis:**
`
});

const anomalyExplanationFlow = ai.defineFlow(
  {
    name: 'anomalyExplanationFlow',
    inputSchema: AnomalyExplanationInputSchema,
    outputSchema: AnomalyExplanationOutputSchema,
  },
  async (input) => {
    const {output} = await anomalyExplanationPrompt(input);
    return output!;
  }
);
