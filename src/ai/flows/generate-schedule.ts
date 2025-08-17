
'use server';
/**
 * @fileOverview AI agent that generates a complete event schedule.
 * Uses a simplified prompt and a robust local repair function.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import {
  GenerateScheduleInput,
  GenerateScheduleOutput,
  InputSchema,
  OutputSchema,
} from '@/lib/schedule-types';
import { solveSchedule } from '@/lib/schedule-solver';

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  return solveSchedule(input);
}

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    return solveSchedule(input);
  }
);
