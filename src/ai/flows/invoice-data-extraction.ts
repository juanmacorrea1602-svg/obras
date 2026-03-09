'use server';
/**
 * @fileOverview A Genkit flow for extracting key data from invoice images.
 *
 * - extractInvoiceData - A function that handles the invoice data extraction process.
 * - InvoiceDataExtractionInput - The input type for the extractInvoiceData function.
 * - InvoiceDataExtractionOutput - The return type for the extractInvoiceData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InvoiceDataExtractionInputSchema = z.object({
  invoiceImageDataUri: z
    .string()
    .describe(
      "A photo of an invoice or remito, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InvoiceDataExtractionInput = z.infer<typeof InvoiceDataExtractionInputSchema>;

const InvoiceItemSchema = z.object({
  description: z.string().describe('Descripción del ítem de la factura.'),
  quantity: z.number().describe('Cantidad del ítem.'),
  unitPrice: z.number().describe('Precio unitario del ítem.'),
  totalPrice: z.number().describe('Precio total del ítem.'),
});

const InvoiceDataExtractionOutputSchema = z.object({
  providerName: z.string().describe('Nombre del proveedor de la factura.'),
  providerCUIT: z.string().describe('Número de CUIT del proveedor.'),
  totalAmount: z.number().describe('Monto total de la factura.'),
  items: z.array(InvoiceItemSchema).describe('Lista de ítems detallados en la factura.'),
});
export type InvoiceDataExtractionOutput = z.infer<typeof InvoiceDataExtractionOutputSchema>;

export async function extractInvoiceData(
  input: InvoiceDataExtractionInput
): Promise<InvoiceDataExtractionOutput> {
  return invoiceDataExtractionFlow(input);
}

const invoiceExtractionPrompt = ai.definePrompt({
  name: 'invoiceExtractionPrompt',
  input: { schema: InvoiceDataExtractionInputSchema },
  output: { schema: InvoiceDataExtractionOutputSchema },
  prompt: `Actuarás como un Arquitecto de Sistemas Expert en Control de Gestión de Obras (PMO). Tu especialidad es la trazabilidad financiera de proyectos de construcción bajo normas argentinas (UECARA/UOCRA).

Tu objetivo es extraer datos clave de la siguiente imagen de factura o remito para precargar un formulario de registro de gastos, minimizando la entrada manual de datos y reduciendo errores.

Extrae la siguiente información de la imagen proporcionada:
- Nombre del proveedor
- Número de CUIT del proveedor
- Monto total de la factura
- Una lista detallada de los ítems, incluyendo descripción, cantidad, precio unitario y precio total para cada uno. Si un ítem no tiene cantidad o precio unitario explícito, haz tu mejor esfuerzo para inferirlo o déjalo como 0 si no se puede determinar.

Por favor, formatea la salida exactamente como se describe en el esquema JSON adjunto.

Imagen de la factura: {{media url=invoiceImageDataUri}}`,
});

const invoiceDataExtractionFlow = ai.defineFlow(
  {
    name: 'invoiceDataExtractionFlow',
    inputSchema: InvoiceDataExtractionInputSchema,
    outputSchema: InvoiceDataExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await invoiceExtractionPrompt(input);
    return output!;
  }
);
