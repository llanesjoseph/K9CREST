
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return new NextResponse(JSON.stringify({ error: "This feature is temporarily disabled." }), {
    status: 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
