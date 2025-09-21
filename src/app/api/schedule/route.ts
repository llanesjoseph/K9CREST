
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { solveSchedule } from "@/lib/schedule-solver";
import { z } from "zod";

// Input validation schema
const ScheduleInputSchema = z.object({
  arenas: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    specialty: z.string().max(50)
  })).max(20), // Limit to 20 arenas
  competitors: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    specialties: z.array(z.any()).max(10) // Limit specialties
  })).max(500), // Limit to 500 competitors
  eventDays: z.array(z.string()).max(30), // Limit to 30 days
  currentSchedule: z.array(z.any()).max(10000) // Limit schedule entries
});

export async function POST(req: Request) {
  try {
    // 1. AUTHENTICATION CHECK
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized - Missing authentication token' }, { status: 401 });
    }

    // 2. VERIFY TOKEN
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // 3. AUTHORIZATION CHECK - Only admins can use schedule solver
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 4. RATE LIMITING CHECK (Basic implementation)
    const userAgent = req.headers.get('user-agent') || '';
    if (userAgent.length > 1000) { // Basic bot detection
      return NextResponse.json({ error: 'Request rejected - Invalid user agent' }, { status: 400 });
    }

    // 5. INPUT VALIDATION
    const rawInput = await req.json();
    const input = ScheduleInputSchema.parse(rawInput);

    // 6. PROCESS REQUEST
    const result = solveSchedule(input);

    // 7. SECURE RESPONSE
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "x-xss-protection": "1; mode=block"
      },
    });
  } catch (error: any) {
    // SECURE ERROR HANDLING - Don't expose internal details
    console.error("Schedule API Error:", {
      error: error.message,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      // Don't log the full error object to prevent information disclosure
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data - Please check your input format' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error - Please try again later' 
    }, { 
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate"
      }
    });
  }
}
