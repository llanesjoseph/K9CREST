
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { generateScheduleAI, repairIfNeeded } from "@/ai/flows/generate-schedule";
import { generateTimeSlots } from "@/lib/schedule-helpers";
import type { GenerateScheduleInput, Arena, Competitor } from '@/lib/schedule-types';
import { allRequestedRuns, buildAllSlots } from "@/lib/schedule-solver";


function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,OPTIONS,GET",
    },
  });
}

export async function OPTIONS() { return json({}, 204); }
export async function GET() { return json({ ok: true, ts: Date.now() }); }

export async function POST(req: Request) {
  try {
    const body: GenerateScheduleInput = await req.json();

    const allSlots = buildAllSlots(body, { runMinutes: 30, slotMinutes: 15, anyRunsFlexible: true, detectionSubtypesStrict: true });
    
    const requiredRuns = allRequestedRuns(body);

    const runAllowlist = requiredRuns.map(run => {
        const allowedSlotIds = allSlots
            .filter(slot => {
                if (run.specialtyType === 'Bite Work') {
                    return slot.arenaSpecialty === 'Bite Work' || slot.arenaSpecialty === 'Any';
                }
                if (run.specialtyType === 'Detection (Narcotics)') {
                    return slot.arenaSpecialty === 'Detection (Narcotics)' || slot.arenaSpecialty === 'Any';
                }
                 if (run.specialtyType === 'Detection (Explosives)') {
                    return slot.arenaSpecialty === 'Detection (Explosives)' || slot.arenaSpecialty === 'Any';
                }
                if(run.specialtyType === 'Any') {
                    return true;
                }
                return false;
            })
            .map(slot => slot.slotId);

        return {
            runKey: `${run.competitorId}|${run.specialtyType}`,
            competitorId: run.competitorId,
            specialtyType: run.specialtyType,
            allowedSlotIds,
        };
    });

    const aiInput = {
        ...body,
        requiredRuns,
        totalRunsNeeded: requiredRuns.length,
        allSlots,
        runAllowlist
    };

    let result = await generateScheduleAI(aiInput);

    result = await repairIfNeeded(result, { allSlots, runAllowlist, totalRunsNeeded: aiInput.totalRunsNeeded });
    
    return json(result, 200);

  } catch (e: any) {
    console.error("schedule error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
}
