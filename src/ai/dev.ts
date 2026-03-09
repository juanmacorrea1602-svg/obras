import { config } from 'dotenv';
config();

import '@/ai/flows/invoice-data-extraction.ts';
import '@/ai/flows/weekly-report-generation.ts';
import '@/ai/flows/anomaly-explanation.ts';