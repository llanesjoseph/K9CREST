
import { NextResponse } from 'next/server';
import { generateSchedule } from '@/ai/flows/generate-schedule';

export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = await generateSchedule(input);
    return NextResponse.json(result);
  } catch (e:any) {
    console.error("Error in schedule generation API:", e);
    return NextResponse.json({ error: e.message || 'Failed to generate schedule.' }, { status: 500 });
  }
}
