"use client";

import { useForm } from "react-hook-form";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
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

const rubric = {
  phases: [
    {
      name: "Obedience Phase",
      exercises: [
        { name: "Heeling on Leash", type: "points", maxPoints: 10 },
        { name: "Sit in Motion", type: "points", maxPoints: 10 },
        { name: "Recall", type: "points", maxPoints: 15 },
        { name: "Long Down", type: "points", maxPoints: 5 },
      ],
    },
    {
      name: "Protection Phase",
      exercises: [
        { name: "Search for Decoy", type: "pass/fail" },
        { name: "Hold and Bark", type: "points", maxPoints: 20 },
        { name: "Escape Bite", type: "points", maxPoints: 20 },
        { name: "Courage Test", type: "points", maxPoints: 20 },
      ],
    },
  ],
};

export default function JudgingPage({ params }: { params: { runId: string } }) {
  const { toast } = useToast();
  const form = useForm();

  function onSubmit(data: any) {
    console.log(data);
    toast({
      title: "Scores Submitted!",
      description: "Scores for John Doe & Rex have been successfully saved.",
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-semibold">Judge Scoring Interface</h1>
            <p className="text-muted-foreground">Event: Summer Regional Championship</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Details</CardTitle>
          <CardDescription>
            Scoring for <span className="font-bold">John Doe</span> with{" "}
            <span className="font-bold">Rex</span> in Arena 1.
          </CardDescription>
        </CardHeader>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {rubric.phases.map((phase, phaseIndex) => (
          <Card key={phase.name}>
            <CardHeader>
              <CardTitle>{phase.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {phase.exercises.map((exercise, exerciseIndex) => (
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
                          {...form.register(`scores.${phaseIndex}.${exerciseIndex}.points`)}
                        />
                        <span className="text-sm text-muted-foreground">
                          / {exercise.maxPoints} pts
                        </span>
                      </div>
                    )}
                    {exercise.type === "pass/fail" && (
                       <div className="flex items-center justify-end gap-2">
                         <Label htmlFor={`switch-${phase.name}-${exercise.name}`}>Fail</Label>
                         <Switch id={`switch-${phase.name}-${exercise.name}`} {...form.register(`scores.${phaseIndex}.${exerciseIndex}.passed`)} />
                         <Label htmlFor={`switch-${phase.name}-${exercise.name}`}>Pass</Label>
                       </div>
                    )}
                  </div>
                  {exerciseIndex < phase.exercises.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
         <Card>
            <CardHeader>
                <CardTitle>General Notes</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea placeholder="Add any overall comments about the run..." {...form.register('notes')} />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Submit Scores
                </Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
}
