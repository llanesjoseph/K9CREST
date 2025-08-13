
"use client";

import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { PhaseBasedScoring } from "./phase-based-scoring";
import { DetectionScoring } from "./detection-scoring";

/**
 * This component acts as a router for the judging interface.
 * It fetches the run, determines the rubric and its type,
 * and then renders the appropriate scoring component.
 */
export default function JudgingPageRouter() {
    const params = useParams();
    const eventId = params.id as string;
    const runId = params.runId as string;
    const { isAdmin } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [runData, setRunData] = useState<any>(null);
    const [eventData, setEventData] = useState<any>(null);
    const [competitorData, setCompetitorData] = useState<any>(null);
    const [arenaData, setArenaData] = useState<any>(null);
    const [rubricData, setRubricData] = useState<any>(null);
    const [judgingInterface, setJudgingInterface] = useState<"phases" | "detection" | null>(null);

    const isReadOnly = useMemo(() => {
        if (isAdmin) return false;
        // return runData?.status === 'scored';
        return false; // TEMP: allow testing
    }, [runData, isAdmin]);
    
    const pageTitle = isReadOnly ? "View Scorecard" : "Judge Scoring Interface";

    useEffect(() => {
        if (!eventId || !runId) {
            setError("Event or Run ID is missing.");
            setLoading(false);
            return;
        }

        const runRef = doc(db, `events/${eventId}/schedule`, runId);
        
        const unsubscribe = onSnapshot(runRef, async (runSnap) => {
            try {
                if (!runSnap.exists()) {
                    throw new Error("Run not found for this event.");
                }
                const run = { id: runSnap.id, ...runSnap.data() };
                setRunData(run);
                
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                if (!eventSnap.exists()) throw new Error("Event not found.");
                setEventData(eventSnap.data());

                const [competitorSnap, arenaSnap] = await Promise.all([
                    run.competitorId ? getDoc(doc(db, `events/${eventId}/competitors`, run.competitorId)) : null,
                    run.arenaId ? getDoc(doc(db, `events/${eventId}/arenas`, run.arenaId)) : null,
                ]);

                if (competitorSnap?.exists()) {
                    setCompetitorData(competitorSnap.data());
                } else {
                     throw new Error("Competitor not found.");
                }

                let finalRubric = null;
                if (arenaSnap?.exists()) {
                    const arena = arenaSnap.data();
                    setArenaData(arena);
                    if (arena.rubricId) {
                        const rubricRef = doc(db, 'rubrics', arena.rubricId);
                        const rubricSnap = await getDoc(rubricRef);
                        if (rubricSnap.exists()) {
                            finalRubric = rubricSnap.data();
                            setRubricData(finalRubric);
                            setJudgingInterface(finalRubric.judgingInterface || "phases");
                        } else {
                            throw new Error("Assigned rubric could not be found.");
                        }
                    } else {
                        // Default to phase-based if no rubric is assigned
                        setJudgingInterface("phases");
                    }
                } else {
                    throw new Error("Arena not found.");
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                toast({
                    variant: "destructive",
                    title: "Error Loading Data",
                    description: err.message,
                });
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Snapshot error:", err);
            setError("Failed to listen for run updates.");
            setLoading(false);
        });

        return () => unsubscribe();

    }, [eventId, runId, toast, isAdmin]);


    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between"><Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-1/3" /></div>
                            <div className="flex items-center justify-between"><Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-1/3" /></div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        if (error) {
            return (
                 <Card>
                     <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                            <div>
                                <p className="font-semibold text-lg">Error Loading Run</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
        }
        
        const sharedProps = {
            eventId,
            runId,
            isReadOnly,
            eventData,
            runData,
            competitorData,
            arenaData,
            rubricData,
        };
        
        if (judgingInterface === 'detection') {
            return <DetectionScoring eventId={eventId} runId={runId} isReadOnly={isReadOnly} />;
        }
        
        // Default to phase-based scoring
        return <PhaseBasedScoring {...sharedProps} />;
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/events/${eventId}/schedule`}>
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <p className="text-muted-foreground">Event: {eventData?.name || '...'}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                <CardTitle>Run Details</CardTitle>
                <CardDescription>
                    {competitorData?.bibNumber && <span className="font-bold text-primary mr-2">#{competitorData.bibNumber}</span>}
                    Scoring for <span className="font-bold">{competitorData?.name || '...'}</span> with{" "}
                    <span className="font-bold">{competitorData?.dogName || '...'}</span> in Arena: <span className="font-bold">{arenaData?.name || '...'}</span>
                </CardDescription>
                </CardHeader>
            </Card>

            {renderContent()}
        </div>
    );
}
