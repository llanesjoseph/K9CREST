import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withRole, addSecurityHeaders } from "@/lib/auth-middleware";
import { sanitizeError } from "@/lib/security";
import { z } from "zod";

// Input validation schema
const EventIdSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid event ID format'),
});

export const DELETE = withRole('admin', async (req, authContext, { params }: { params: { id: string } }) => {
  try {
    // Validate event ID
    const validation = EventIdSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const eventId = validation.data.id;
    const eventRef = adminDb.collection('events').doc(eventId);

    // Check if event exists
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete competitors subcollection in batches
    const competitorsSnap = await eventRef.collection('competitors').get();

    // Prevent deletion of events with too many competitors (to avoid timeout)
    if (competitorsSnap.size > 500) {
      return NextResponse.json(
        {
          error: 'Event has too many competitors. Please use batch deletion.',
          count: competitorsSnap.size
        },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    competitorsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Delete the event document
    await eventRef.delete();

    console.log('Event deleted:', {
      eventId,
      deletedBy: authContext.uid,
      competitorsDeleted: competitorsSnap.size,
      timestamp: new Date().toISOString(),
    });

    const response = NextResponse.json({
      ok: true,
      eventId,
      competitorsDeleted: competitorsSnap.size
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Delete Event API Error:", {
      adminUid: authContext.uid,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    const sanitized = sanitizeError(error);
    return NextResponse.json(sanitized, { status: 500 });
  }
});

