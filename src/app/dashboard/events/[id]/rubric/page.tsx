
"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { PlusCircle, Trash2, ChevronLeft, GripVertical, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  type: z.enum(["points", "time", "pass/fail"]),
  maxPoints: z.coerce.number().optional(),
});

const phaseSchema = z.object({
  name: z.string().min(1, "Phase name is required."),
  exercises: z.array(exerciseSchema),
});

const rubricSchema = z.object({
  phases: z.array(phaseSchema),
});

export default function RubricPage() {
  const { toast } = useToast();
  const params = useParams();
  const eventId = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof rubricSchema>>({
    resolver: zodResolver(rubricSchema),
    defaultValues: {
      phases: [],
    },
  });

  useEffect(() => {
    if (!eventId) return;
    const fetchRubric = async () => {
      setIsLoading(true);
      try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists() && eventSnap.data().rubric) {
          form.reset({ phases: eventSnap.data().rubric.phases || [] });
        } else {
          // If no rubric exists, initialize with empty phases
          form.reset({ phases: [] });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch rubric data.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRubric();
  }, [eventId, form, toast]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phases",
  });

  async function onSubmit(data: z.infer<typeof rubricSchema>) {
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      const eventRef = doc(db, "events", eventId);
      // Use setDoc with merge to create or update the rubric
      await setDoc(eventRef, { rubric: data }, { merge: true });
      toast({
        title: "Rubric Saved!",
        description: "The scoring rubric has been successfully updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save the rubric.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}/schedule`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Rubric Configuration</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scoring Rubric</CardTitle>
          <CardDescription>
            Define the phases and exercises for this event. Your changes are saved when you click the "Save Rubric" button.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Accordion type="multiple" className="w-full space-y-4" defaultValue={fields.map((_, index) => `item-${index}`)}>
                {fields.map((phase, phaseIndex) => (
                  <AccordionItem key={phase.id} value={`item-${phaseIndex}`} className="border rounded-lg bg-background">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-4 flex-grow">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <FormField
                                control={form.control}
                                name={`phases.${phaseIndex}.name`}
                                render={({ field }) => <Input {...field} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto" onClick={(e) => e.stopPropagation()} />}
                            />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <PhaseExercises control={form.control} phaseIndex={phaseIndex} />
                       <div className="flex justify-end mt-4">
                           <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(phaseIndex)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Phase
                          </Button>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
                {isLoading ? (
                    <div className="text-center text-muted-foreground py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p>Loading Rubric...</p>
                    </div>
                ) : fields.length === 0 && (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                        <p className="font-semibold">No phases defined yet.</p>
                        <p>Click "Add Phase" to get started building your scoring rubric.</p>
                    </div>
                )}
              <div className="flex justify-between items-center mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: "New Phase", exercises: [] })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" asChild><Link href={`/dashboard/events/${eventId}/schedule`}>Cancel</Link></Button>
                    <Button type="submit" disabled={isSubmitting || isLoading}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Rubric
                    </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function PhaseExercises({ control, phaseIndex }: { control: any, phaseIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `phases.${phaseIndex}.exercises`,
  });

  return (
    <div className="space-y-4 pl-8 border-l ml-2">
      {fields.map((exercise, exerciseIndex) => (
        <ExerciseItem 
            key={exercise.id} 
            control={control} 
            phaseIndex={phaseIndex} 
            exerciseIndex={exerciseIndex} 
            remove={remove}
        />
      ))}
       {fields.length === 0 && (
          <p className="text-sm text-muted-foreground pt-4">No exercises in this phase. Add one below.</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => append({ name: "", type: "points", maxPoints: 10 })}
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
      </Button>
    </div>
  );
}

function ExerciseItem({ control, phaseIndex, exerciseIndex, remove }: { control: any, phaseIndex: number, exerciseIndex: number, remove: (index: number) => void}) {
    const exerciseType = useWatch({
        control,
        name: `phases.${phaseIndex}.exercises.${exerciseIndex}.type`,
    });

    const showMaxPoints = exerciseType === 'points' || exerciseType === 'time';
    const showPassFail = exerciseType === 'pass/fail';

    return (
        <div className="flex items-start gap-4 p-4 rounded-md border bg-secondary/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow">
            <FormField
              control={control}
              name={`phases.${phaseIndex}.exercises.${exerciseIndex}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Heeling" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`phases.${phaseIndex}.exercises.${exerciseIndex}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="pass/fail">Pass/Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <div className="h-full flex items-end">
                {showMaxPoints && (
                    <FormField
                      control={control}
                      name={`phases.${phaseIndex}.exercises.${exerciseIndex}.maxPoints`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>{exerciseType === 'time' ? 'Max Time (sec)' : 'Max Points'}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder={exerciseType === 'time' ? "e.g., 60" : "e.g., 10"} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                )}
                {showPassFail && (
                     <FormItem className="w-full">
                        <FormLabel>Score Input</FormLabel>
                        <FormControl>
                            <div className="flex items-center justify-start gap-4 h-10 border border-input bg-background rounded-md px-3">
                               <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-destructive" />
                                    <span>Fail</span>
                               </div>
                               <div className="flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>Pass</span>
                               </div>
                            </div>
                        </FormControl>
                    </FormItem>
                )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-8 text-muted-foreground hover:text-destructive"
            onClick={() => remove(exerciseIndex)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
    )
}
