import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {};

  // Firestore Admin check
  try {
    const docRef = adminDb.doc("__health__/ping");
    await docRef.set({ ts: Date.now() }, { merge: true });
    const snap = await docRef.get();
    checks.firestore_admin = { ok: snap.exists };
  } catch (error: any) {
    checks.firestore_admin = { ok: false, message: String(error?.message || error) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return new NextResponse(JSON.stringify({ ok: allOk, checks }), {
    status: allOk ? 200 : 503,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

