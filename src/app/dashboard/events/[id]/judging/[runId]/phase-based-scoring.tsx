
"use client";

import { useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { ChevronLeft, Save, Loader2, Play, Square, TimerIcon } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

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

interface PhaseBasedScoringProps {
    eventId: string;
    runId: string;
    isReadOnly: boolean;
    eventData: any;
    runData: any;
    competitorData: any;
    arenaData: any;
    rubricData: any;
}

export function PhaseBasedScoring({ eventId, runId, isReadOnly, eventData, runData, competitorData, arenaData, rubricData }: PhaseBasedScoringProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


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
    // Initialize form with rubric structure and existing scores
    const initialScores = (rubricData?.phases || []).map((phase: any) => ({
      phaseName: phase.name,
      exercises: phase.exercises.map((ex: any) => {
        const existingPhase = runData.scores?.find((s:any) => s.phaseName === phase.name);
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
    
    const initialTime = runData.totalTime || 0;
    setElapsedTime(initialTime);

    form.reset({
        scores: initialScores,
        notes: runData.notes || '',
        totalTime: initialTime,
    });
  }, [rubricData, runData, form]);
  
  const handleStartTimer = () => {
    if(!isReadOnly) {
        if (runData?.actualStartTime) {
            // This is a resume
             const serverStartTime = runData.actualStartTime.toDate();
             const lastElapsedTime = runData.totalTime || 0;
             const correctedStartTime = Date.now() - (lastElapsedTime * 1000);
             setIsTimerRunning(true);
        } else {
            // This is a fresh start
            updateDoc(doc(db, `events/${eventId}/schedule`, runId), { actualStartTime: new Date() });
            setIsTimerRunning(true);
        }
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
    
    // Make sure timer is stopped and final time is recorded before submitting
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
            status: 'scored' // Mark as scored
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
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time * 10) % 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
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
                                            onCheckedChange={(isChecked) => {
                                                const isTimePenalty = typeof exercise.maxPoints === 'number' && exercise.maxPoints < 0;
                                                
                                                if (isTimePenalty) {
                                                    const timeAdjustment = Math.abs(exercise.maxPoints!);
                                                    setElapsedTime(prev => prev + (isChecked ? timeAdjustment : -timeAdjustment));
                                                }
                                                
                                                const pointValue = isChecked ? 1 : 0;
                                                field.onChange(pointValue);
                                            }}
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
    </div>
  );
}

    