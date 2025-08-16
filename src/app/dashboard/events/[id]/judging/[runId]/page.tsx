
"use client";

import { useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { ChevronLeft, Save, Loader2, Play, Square, TimerIcon, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { DetectionScoring } from "./detection-scoring";
import type { ScheduledEvent } from "@/lib/schedule-types";

interface Rubric {
    id: string;
    judgingInterface?: 'phases' | 'detection';
    phases?: any[];
    [key: string]: any; // Allow other properties
}

interface JudgingFormValues {
    scores: {
        phaseName: string;
        exercises: {
            exerciseName: string;
            score: number | boolean;
            type: string;
            maxPoints?: number;
        }[];
    }[];
    notes: string;
    totalTime: number;
}

export default function JudgingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { isAdmin } = useAuth();
  const eventId = params.id as string;
  const runId = params.runId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [runData, setRunData] = useState<ScheduledEvent | null>(null);
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [arenaData, setArenaData] = useState<any>(null);
  const [rubricData, setRubricData] = useState<Rubric | null>(null);
  const [judgingInterface, setJudgingInterface] = useState<"phases" | "detection" | null>(null);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isReadOnly = useMemo(() => {
    if (isAdmin) return false;
    return runData?.status === 'scored' || runData?.status === 'locked';
  }, [runData, isAdmin]);

  const pageTitle = isReadOnly ? "View Scorecard" : "Judge Scoring Interface";

  const form = useForm<JudgingFormValues>({
      defaultValues: { scores: [], notes: "", totalTime: 0 }
  });
  
  useEffect(() => {
      return () => {
          if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
          }
      };
  }, []);
  
  useEffect(() => {
    if (isTimerRunning) {
        const startTime = Date.now() - elapsedTime * 1000;
        timerIntervalRef.current = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);
    } else {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    }
  }, [isTimerRunning, elapsedTime]);

  useEffect(() => {
    if (!eventId || !runId) return;

    const runRef = doc(db, `events/${eventId}/schedule`, runId);
    const unsubscribe = onSnapshot(runRef, async (runSnap) => {
      try {
        if (loading) setLoading(true);

        if (!runSnap.exists()) {
            throw new Error("Run not found for this event.");
        }
        
        const run = { id: runSnap.id, ...runSnap.data() } as ScheduledEvent;
        setRunData(run);
        
        const eventRef = doc(db, 'events', eventId);
        
        const [eventSnap, competitorSnap, arenaSnap] = await Promise.all([
             getDoc(eventRef),
             run.competitorId ? getDoc(doc(db, `events/${eventId}/competitors`, run.competitorId)) : null,
             run.arenaId ? getDoc(doc(db, `events/${eventId}/arenas`, run.arenaId)) : null,
        ]);
        
        if (!eventSnap.exists()) throw new Error("Event not found.");
        setEventData(eventSnap.data());

        if(competitorSnap?.exists()) {
             setCompetitorData(competitorSnap.data());
        }

        let finalRubric: Rubric | null = null;
        if(arenaSnap?.exists()) {
            const arena = arenaSnap.data();
            setArenaData(arena);
            if (arena.rubricId) {
                const rubricRef = doc(db, 'rubrics', arena.rubricId);
                const rubricSnap = await getDoc(rubricRef);
                if (rubricSnap.exists()) {
                    finalRubric = { id: rubricSnap.id, ...rubricSnap.data() } as Rubric;
                    setRubricData(finalRubric);
                    setJudgingInterface(finalRubric.judgingInterface || "phases");
                }
            } else {
                 setJudgingInterface("phases");
            }
        } else {
             throw new Error("Arena not found for this run.");
        }
        
        const initialScores = (finalRubric?.phases || []).map((phase: any) => ({
          phaseName: phase.name,
          exercises: phase.exercises.map((ex: any) => {
            const existingPhase = run.scores?.find((s:any) => s.phaseName === phase.name);
            const existingExercise = existingPhase?.exercises.find((e:any) => e.exerciseName === ex.name);
            
            let defaultScore: number | boolean = 0;
            if (ex.type === 'pass/fail') defaultScore = false;
            if (ex.type === 'time') defaultScore = 0.0;
            
            return {
              exerciseName: ex.name,
              score: existingExercise?.score ?? defaultScore,
              type: ex.type,
              maxPoints: ex.maxPoints,
            }
          }),
        }));
        
        const initialTime = run.totalTime || 0;
        setElapsedTime(initialTime);

        form.reset({
            scores: initialScores,
            notes: run.notes || '',
            totalTime: initialTime,
        });

      } catch (err: any) {
        console.error(err);
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Could not load run data. Please go back and try again.",
        });
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [eventId, runId, toast, form, router, isAdmin, loading]);
  
  const handleStartTimer = () => {
    if(!isReadOnly) {
        updateDoc(doc(db, `events/${eventId}/schedule`, runId), { actualStartTime: serverTimestamp() });
        setIsTimerRunning(true);
    }
  }

  const handleStopTimer = () => {
    if(!isReadOnly) {
        setIsTimerRunning(false);
        form.setValue('totalTime', elapsedTime, { shouldDirty: true });
    }
  }

  async function onSubmit(data: JudgingFormValues) {
    if(!runId || !eventId || isReadOnly) return;
    setIsSubmitting(true);
    
    if (isTimerRunning) {
        setIsTimerRunning(false);
    }
    const finalTime = isTimerRunning ? elapsedTime : form.getValues('totalTime');

    try {
        const runRef = doc(db, `events/${eventId}/schedule`, runId);
        await updateDoc(runRef, {
            scores: data.scores,
            notes: data.notes,
            totalTime: finalTime,
            status: 'scored',
            actualEndTime: serverTimestamp(),
        });
        
        toast({
            title: "Scores Submitted!",
            description: "Scores have been successfully saved.",
        });
        router.push(`/dashboard/events/${eventId}/schedule`);
        
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Submission Error",
            description: "Failed to save scores. Please try again."
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  if(loading) {
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
      )
  }

  if(error) {
       return (
            <Card>
                <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                    <div>
                        <p className="font-semibold text-lg">Error Loading Run</p>
                        <p className="text-sm">{error}</p>
                    </div>
                     <Button variant="outline" asChild>
                        <Link href={`/dashboard/events/${eventId}/schedule`}>Back to Schedule</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
       )
  }
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time * 10) % 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
  };

  const renderContent = () => {
    if (judgingInterface === 'detection') {
        return <DetectionScoring eventId={eventId} runId={runId} isReadOnly={isReadOnly} />;
    }

    // Default to phase-based
    return (
    <>
       <Card className={cn("border-primary/50", isTimerRunning && "bg-yellow-50 dark:bg-yellow-900/10")}>
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-primary">
                    <TimerIcon className="h-8 w-8" />
                    <span className="font-mono text-5xl tracking-tighter">
                        {formatTime(elapsedTime)}
                    </span>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleStartTimer} disabled={isTimerRunning} size="lg" className="w-40 bg-green-600 hover:bg-green-700">
                        <Play className="mr-2" /> Start Run
                    </Button>
                    <Button onClick={handleStopTimer} disabled={!isTimerRunning} size="lg" variant="destructive" className="w-40">
                        <Square className="mr-2" /> Stop Run
                    </Button>
                  </div>
                )}
            </CardContent>
        </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!rubricData?.phases || rubricData.phases.length === 0 ? (
          <Card>
            <CardHeader>
                <CardTitle>No Rubric Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                The scoring rubric for this arena has not been configured yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          form.getValues('scores').map((phase, phaseIndex) => (
            <Card key={phase.phaseName}>
              <CardHeader>
                <CardTitle>{phase.phaseName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {phase.exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.exerciseName}>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor={`${phase.phaseName}-${exercise.exerciseName}`} className="col-span-2">
                        {exercise.exerciseName}
                      </Label>
                      {exercise.type === "points" && (
                        <div className="flex items-center gap-2">
                          <Input
                            id={`${phase.phaseName}-${exercise.exerciseName}`}
                            type="number"
                            placeholder="0"
                            className="text-right"
                            max={exercise.maxPoints}
                            readOnly={isReadOnly}
                            {...form.register(`scores.${phaseIndex}.exercises.${exerciseIndex}.score`)}
                          />
                          <span className="text-sm text-muted-foreground">
                            / {exercise.maxPoints} pts
                          </span>
                        </div>
                      )}
                      {exercise.type === "time" && (
                        <div className="flex items-center gap-2">
                          <Input
                            id={`${phase.phaseName}-${exercise.exerciseName}`}
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            className="text-right"
                            readOnly={isReadOnly}
                             {...form.register(`scores.${phaseIndex}.exercises.${exerciseIndex}.score`)}
                          />
                          <span className="text-sm text-muted-foreground">
                            seconds
                          </span>
                        </div>
                      )}
                       {exercise.type === "pass/fail" && (
                          isReadOnly ? (
                            <div className="flex items-center justify-end gap-2 text-right">
                                <span className="font-mono text-lg">
                                    {(exercise.score === 1 || exercise.score === true) ? (exercise.maxPoints || 1) : 0}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    / {exercise.maxPoints} pts
                                </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                                <Label htmlFor={`switch-${phaseIndex}-${exerciseIndex}`} className="text-sm font-normal">Fail</Label>
                                <Controller
                                    control={form.control}
                                    name={`scores.${phaseIndex}.exercises.${exerciseIndex}.score`}
                                    render={({ field }) => (
                                        <Switch
                                            id={`switch-${phaseIndex}-${exerciseIndex}`}
                                            checked={field.value === 1 || field.value === true}
                                            onCheckedChange={(isChecked) => field.onChange(isChecked ? 1 : 0)}
                                            disabled={isReadOnly}
                                        />
                                    )}
                                />
                                <Label htmlFor={`switch-${phaseIndex}-${exerciseIndex}`} className="text-sm font-normal">Pass</Label>
                            </div>
                         )
                      )}
                    </div>
                    {exerciseIndex < phase.exercises.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
         <Card>
            <CardHeader>
                <CardTitle>General Notes</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea placeholder="Add any overall comments about the run..." {...form.register('notes')} readOnly={isReadOnly} />
            </CardContent>
            {!isReadOnly && (
                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !rubricData || isTimerRunning}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isTimerRunning ? 'Stop Timer to Submit' : 'Submit Scores'}
                    </Button>
                </CardFooter>
            )}
        </Card>
      </form>
    </>
    );
  }

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

    