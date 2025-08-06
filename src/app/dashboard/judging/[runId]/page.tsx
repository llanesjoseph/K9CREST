
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import Link from "next/link";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
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
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface JudgingFormValues {
    scores: {
        phaseName: string;
        exercises: {
            exerciseName: string;
            score: number | boolean;
        }[];
    }[];
    notes: string;
}

export default function JudgingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const runId = params.runId as string; // Note: This should be the SCHEDULE ID from Firestore
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null);
  const [competitorData, setCompetitorData] = useState<any>(null);

  const form = useForm<JudgingFormValues>({
      defaultValues: { scores: [], notes: "" }
  });

  useEffect(() => {
    if (!runId) return;

    const fetchData = async () => {
      try {
        // This logic assumes we can find the event from the run.
        // In a real app, you might pass eventId in the URL: /dashboard/events/[eventId]/judging/[runId]
        // For now, we'll try to deduce it, which is brittle. Let's assume a hardcoded event for now.
        const eventId = "iFImBv9C03yL0wz1K5NA"; // HARDCODED FOR NOW
        
        const eventRef = doc(db, "events", eventId);
        const runRef = doc(db, `events/${eventId}/schedule`, runId);
        
        const [eventSnap, runSnap] = await Promise.all([
          getDoc(eventRef),
          getDoc(runRef)
        ]);

        if (!eventSnap.exists()) throw new Error("Event not found.");
        if (!runSnap.exists()) throw new Error("Run not found.");

        const event = eventSnap.data();
        const run = runSnap.data();
        setEventData(event);
        setRunData(run);
        
        if(run.competitorId) {
            const competitorRef = doc(db, `events/${eventId}/competitors`, run.competitorId);
            const competitorSnap = await getDoc(competitorRef);
            if(competitorSnap.exists()) {
                setCompetitorData(competitorSnap.data());
            }
        }

        // Initialize form with rubric structure
        const initialScores = (event.rubric?.phases || []).map((phase: any) => ({
          phaseName: phase.name,
          exercises: phase.exercises.map((ex: any) => ({
            exerciseName: ex.name,
            score: ex.type === 'pass/fail' ? false : 0, // Default score
          })),
        }));
        
        form.reset({
            scores: initialScores,
            notes: run.notes || ''
        });


      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load run data. Please go back and try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [runId, toast, form]);

  async function onSubmit(data: JudgingFormValues) {
    if(!runId || !eventData) return;
    setIsSubmitting(true);
    
    // In a real app, this eventId should come from the URL or state
    const eventId = "iFImBv9C03yL0wz1K5NA";
    
    try {
        const runRef = doc(db, `events/${eventId}/schedule`, runId);
        await updateDoc(runRef, {
            scores: data.scores,
            notes: data.notes,
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

  if(loading) {
      return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/events/${eventData?.id || ''}/schedule`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-semibold">Judge Scoring Interface</h1>
            <p className="text-muted-foreground">Event: {eventData?.name || '...'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Details</CardTitle>
          <CardDescription>
            Scoring for <span className="font-bold">{competitorData?.name || '...'}</span> with{" "}
            <span className="font-bold">{competitorData?.dogName || '...'}</span>.
          </CardDescription>
        </CardHeader>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!eventData?.rubric?.phases || eventData.rubric.phases.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                The scoring rubric for this event has not been configured yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          eventData.rubric.phases.map((phase: any, phaseIndex: number) => (
            <Card key={phase.name}>
              <CardHeader>
                <CardTitle>{phase.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {phase.exercises.map((exercise: any, exerciseIndex: number) => (
                  <div key={exercise.name}>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor={`${phase.name}-${exercise.name}`} className="col-span-2">
                        {exercise.name}
                      </Label>
                      {exercise.type === "points" && (
                        <div className="flex items-center gap-2">
                          <Input
                            id={`${phase.name}-${exercise.name}`}
                            type="number"
                            placeholder="0"
                            className="text-right"
                            max={exercise.maxPoints}
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
                            id={`${phase.name}-${exercise.name}`}
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            className="text-right"
                             {...form.register(`scores.${phaseIndex}.exercises.${exerciseIndex}.score`)}
                          />
                          <span className="text-sm text-muted-foreground">
                            seconds
                          </span>
                        </div>
                      )}
                       {exercise.type === "pass/fail" && (
                        <div className="flex items-center justify-end gap-2">
                           <Label htmlFor={`switch-${phaseIndex}-${exerciseIndex}`} className="text-sm font-normal">Fail</Label>
                            <Controller
                                control={form.control}
                                name={`scores.${phaseIndex}.exercises.${exerciseIndex}.score`}
                                render={({ field }) => (
                                    <Switch
                                        id={`switch-${phaseIndex}-${exerciseIndex}`}
                                        checked={field.value as boolean}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor={`switch-${phaseIndex}-${exerciseIndex}`} className="text-sm font-normal">Pass</Label>
                        </div>
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
                <Textarea placeholder="Add any overall comments about the run..." {...form.register('notes')} />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Scores
                </Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
}
