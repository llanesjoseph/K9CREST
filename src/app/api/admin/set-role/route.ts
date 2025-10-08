import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { withRole, addSecurityHeaders } from "@/lib/auth-middleware";
import { sanitizeError } from "@/lib/security";
import { z } from "zod";

// Input validation schema
const SetRoleSchema = z.object({
  uid: z.string().min(1).max(128).regex(/^[a-zA-Z0-9]+$/, 'Invalid UID format'),
  role: z.enum(['admin', 'judge', 'competitor', 'spectator']),
});

export const POST = withRole('admin', async (req, authContext) => {
  try {
    // Validate input
    const rawInput = await req.json();
    const input = SetRoleSchema.parse(rawInput);

    // Prevent admins from accidentally removing their own admin role
    if (input.uid === authContext.uid && input.role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    // Set custom claims in Firebase Auth
    await getAuth().setCustomUserClaims(input.uid, { role: input.role });

    // Update user profile in Firestore
    await adminDb.collection('users').doc(input.uid).set(
      {
        role: input.role,
        updatedAt: new Date(),
        updatedBy: authContext.uid,
      },
      { merge: true }
    );

    const response = NextResponse.json({
      ok: true,
      uid: input.uid,
      role: input.role
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Set Role API Error:", {
      adminUid: authContext.uid,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data - uid and role are required' },
        { status: 400 }
      );
    }

    const sanitized = sanitizeError(error);
    return NextResponse.json(sanitized, { status: 500 });
  }
});

