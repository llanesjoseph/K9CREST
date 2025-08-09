
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";


export default function RubricPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/rubrics');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Redirecting...</p>
            <p className="text-sm text-muted-foreground">Moving to the new global rubric management page.</p>
        </div>
    );
}
