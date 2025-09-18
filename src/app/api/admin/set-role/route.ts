import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    // Verify caller is admin via Firebase App Hosting IAM (assumed) or future session verification.
    // For now, require a bearer token ID token in Authorization and check its custom claim.
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid, role } = await req.json();
    if (!uid || !role || !['admin', 'judge', 'competitor', 'spectator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await getAuth().setCustomUserClaims(uid, { role });

    // Optionally write to a users profile doc
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

