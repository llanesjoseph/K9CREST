"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { PlusCircle, Trash2, ChevronLeft, GripVertical } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

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
  const form = useForm<z.infer<typeof rubricSchema>>({
    resolver: zodResolver(rubricSchema),
    defaultValues: {
      phases: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phases",
  });

  function onSubmit(data: z.infer<typeof rubricSchema>) {
    console.log(data);
    toast({
      title: "Rubric Saved!",
      description: "The scoring rubric has been successfully updated.",
    });
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/events/1/schedule"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Rubric Configuration</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scoring Rubric</CardTitle>
          <CardDescription>
            Define the phases and exercises for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Accordion type="multiple" className="w-full space-y-4">
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
                {fields.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No phases defined.</p>
                        <p>Click "Add Phase" to get started.</p>
                    </div>
                )}
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: "New Phase", exercises: [] })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" asChild><Link href="/dashboard/events/1/schedule">Cancel</Link></Button>
                    <Button type="submit">Save Rubric</Button>
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
        <div key={exercise.id} className="flex items-start gap-4 p-4 rounded-md border bg-secondary/50">
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
            <FormField
              control={control}
              name={`phases.${phaseIndex}.exercises.${exerciseIndex}.maxPoints`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Points</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="e.g., 10" />
                  </FormControl>
                </FormItem>
              )}
            />
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
      ))}
       {fields.length === 0 && (
          <p className="text-sm text-muted-foreground pt-4">No exercises in this phase.</p>
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
