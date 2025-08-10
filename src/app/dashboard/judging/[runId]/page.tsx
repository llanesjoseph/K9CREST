
"use client";

import { useEffect } from "react";
import { useParams, useRouter }from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This page is a redirector to the new, more efficient judging page structure.
 * /dashboard/judging/[runId] is deprecated in favor of /dashboard/events/[eventId]/judging/[runId]
 * This component will attempt to find the event and redirect.
 */
export default function DeprecatedJudgingPageRedirect() {
    const router = useRouter();
    const params = useParams();
    const runId = params.runId as string;

    useEffect(() => {
        // This is a fallback. In a real app, you might have a mapping
        // or you would have updated all links to the new structure.
        // For now, we'll just redirect to the events page as we can't know the eventId.
        if(runId) {
            router.replace('/dashboard/events');
        }
    }, [router, runId]);

    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Redirecting...</p>
            <p className="text-sm text-muted-foreground">Moving to the new judging page structure.</p>
        </div>
    );
}
