
import { NextResponse } from "next/server";
import { solveSchedule } from "@/lib/schedule-solver";

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const result = solveSchedule(input);
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("Schedule API Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }
}
