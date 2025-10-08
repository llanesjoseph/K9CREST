
import { NextResponse } from "next/server";
import { withRole, addSecurityHeaders } from "@/lib/auth-middleware";
import { solveSchedule } from "@/lib/schedule-solver";
import { sanitizeError } from "@/lib/security";
import { InputSchema } from "@/lib/schedule-types";

export const POST = withRole('admin', async (req, authContext) => {
  try {
    // Input validation
    const rawInput = await req.json();
    const input = InputSchema.parse(rawInput);

    // Process request
    const result = solveSchedule(input);

    // Return secure response
    const response = NextResponse.json(result);
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error("Schedule API Error:", {
      uid: authContext.uid,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // More specific error handling for Zod validation errors
    if (error.name === 'ZodError') {
      console.error("Validation errors:", error.errors);
      return NextResponse.json(
        {
          error: 'Invalid request data - Please check your input format',
          details: error.errors
        },
        { status: 400 }
      );
    }

    const sanitized = sanitizeError(error);
    return NextResponse.json(sanitized, { status: 500 });
  }
});
