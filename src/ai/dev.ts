
import { config } from 'dotenv';
config();

// Re-enable AI flows
import '@/ai/flows/suggest-address.ts';
import '@/ai/flows/process-competitor-csv.ts';
import '@/ai/flows/generate-schedule.ts';
