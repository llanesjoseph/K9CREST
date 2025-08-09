
// app/api/schedule/route.ts
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextResponse } from 'next/server';
import { generateScheduleService } from '@/lib/schedule-service';

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST,OPTIONS,GET',
    },
  });
}
export async function OPTIONS() { return json({}, 204); }
export async function GET() { return json({ ok: true, ts: Date.now() }); }

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = await generateScheduleService(input);
    return json(result, 200);
  } catch (e: any) {
    console.error('schedule error', e);
    return json({ error: e?.message ?? 'Internal error' }, 500);
  }
}
