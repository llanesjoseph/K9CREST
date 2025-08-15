"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { PlusCircle, Trash2, ChevronLeft, GripVertical, CheckCircle, XCircle, Loader2, Save, Lock } from "lucide-react";
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
  FormDescription,
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
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Exercise name is required."),
  type: z.enum(["points", "time", "pass/fail"]),
  maxPoints: z.coerce.number().optional(),
});

const phaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Phase name is required."),
  exercises: z.array(exerciseSchema),
});

const rubricSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Rubric name is required."),
  judgingInterface: z.enum(["phases", "detection"]).default("phases"),
  totalPoints: z.coerce.number({ required_error: "Total points are required." }).min(1, "Total points must be greater than 0.").optional(),
  phases: z.array(phaseSchema),
});

type Rubric = z.infer<typeof rubricSchema>;

const defaultDetectionRubric: Rubric = {
    id: 'default-detection',
    name: "Detection & Teamwork",
    judgingInterface: "detection",
    phases: [],
};

const defaultTacticalRubrics: Omit<Rubric, 'id'>[] = [
    {
        name: "Car Jump Challenge",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "Car Jump",
                exercises: [
                    { name: "Successful deploy over vehicle", type: "points", maxPoints: 15 },
                    { name: "Verbal out", type: "points", maxPoints: 5 },
                    { name: "Recall", type: "points", maxPoints: 5 },
                    { name: "PENALTY: Handler out of cover", type: "pass/fail", maxPoints: -10 },
                ]
            }
        ]
    },
    {
        name: "E-Bike Pursuit Challenge",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "E-Bike Pursuit",
                exercises: [
                    { name: "Handler Challenges Decoy", type: "points", maxPoints: 5 },
                    { name: "Successfully Sends Dog", type: "points", maxPoints: 5 },
                    { name: "Successful Verbal Recall", type: "points", maxPoints: 15 },
                ]
            }
        ]
    },
    {
        name: "Trojan Horse",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "Trojan Horse",
                exercises: [
                    { name: "Successful Van Deployment", type: "points", maxPoints: 10 },
                    { name: "Engages Decoy", type: "points", maxPoints: 10 },
                    { name: "Hard Out", type: "points", maxPoints: 5 },
                ]
            }
        ]
    },
    {
        name: "Long Call-By",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "Long Call-By",
                exercises: [
                    { name: "Stays in Down", type: "points", maxPoints: 10 },
                    { name: "Call to a Heel (*No Bite)", type: "points", maxPoints: 10 },
                    { name: "Shoulder Carry", type: "points", maxPoints: 5 },
                ]
            }
        ]
    },
     {
        name: "Bonus Challenge (Handler Protection)",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "Bonus Challenge",
                exercises: [
                    { name: "1 Shot while Shoulder Carrying", type: "points", maxPoints: 5 },
                    { name: "Successful Deployment", type: "points", maxPoints: 5 },
                    { name: "Engages Decoy", type: "points", maxPoints: 10 },
                    { name: "Hard Out", type: "points", maxPoints: 5 },
                    { name: "PENALTY: Missed shot", type: "pass/fail", maxPoints: -10 },
                ]
            }
        ]
    },
    {
        name: "Bonus Challenge (Tactical)",
        judgingInterface: "phases",
        totalPoints: 25,
        phases: [
            {
                name: "Bonus Challenge",
                exercises: [
                    { name: "Successful Deployment", type: "points", maxPoints: 15 },
                    { name: "Successful Recall", type: "points", maxPoints: 10 },
                    { name: "PENALTY: Hit by Ball", type: "pass/fail", maxPoints: -10 },
                ]
            }
        ]
    },
];


export default function ManageRubricsPage() {
    const { isAdmin } = useAuth();
    const [rubrics, setRubrics] = useState<Rubric[]>([]);
    const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newRubricName, setNewRubricName] = useState("");
    const { toast } = useToast();

     const seedDefaultRubrics = useCallback(async (existingRubrics: Rubric[]) => {
        const existingNames = new Set(existingRubrics.map(r => r.name));
        const rubricsToCreate = defaultTacticalRubrics.filter(r => !existingNames.has(r.name));

        if (rubricsToCreate.length > 0) {
            try {
                const batch = writeBatch(db);
                const rubricsCollection = collection(db, "rubrics");
                rubricsToCreate.forEach(rubricData => {
                    const docRef = doc(rubricsCollection);
                    batch.set(docRef, rubricData);
                });
                await batch.commit();
                console.log(`Seeded ${rubricsToCreate.length} tactical rubrics.`);
            } catch (error) {
                console.error("Error seeding default rubrics:", error);
                toast({ variant: "destructive", title: "Seeding Error", description: "Could not create default starter rubrics."})
            }
        }
    }, [toast]);


    useEffect(() => {
        const unsub = onSnapshot(collection(db, "rubrics"), (snapshot) => {
            const rubricsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rubric));
            setRubrics(rubricsData);
            
            if (isLoading) {
                seedDefaultRubrics(rubricsData);
            }

            setIsLoading(false);
        });
        return () => unsub();
    }, [isLoading, seedDefaultRubrics]);

    const handleCreateRubric = async () => {
        if (newRubricName.trim() === "") {
            toast({ variant: "destructive", title: "Error", description: "Rubric name cannot be empty." });
            return;
        }
        setIsCreating(true);
        try {
            const docRef = await addDoc(collection(db, "rubrics"), { 
                name: newRubricName.trim(), 
                phases: [], 
                totalPoints: 100,
                judgingInterface: "phases"
            });
            setSelectedRubricId(docRef.id);
            setNewRubricName("");
             toast({ title: "Success", description: "Rubric created successfully." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not create rubric." });
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleDeleteRubric = async (rubricId: string, rubricName: string) => {
        if(!rubricId || rubricId === defaultDetectionRubric.id) return;
        try {
            await deleteDoc(doc(db, "rubrics", rubricId));
            toast({ title: "Rubric Deleted", description: `Rubric "${rubricName}" has been deleted.` });
            if(selectedRubricId === rubricId) {
                setSelectedRubricId(null);
            }
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Could not delete rubric." });
        }
    }

    const allDisplayRubrics = [defaultDetectionRubric, ...rubrics].sort((a, b) => {
        if (a.id === 'default-detection') return -1;
        if (b.id === 'default-detection') return 1;
        return a.name.localeCompare(b.name);
    });
    
    const selectedRubric = allDisplayRubrics.find(r => r.id === selectedRubricId);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Rubric Library</CardTitle>
                        <CardDescription>Select a rubric to edit or create a new one.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                         {allDisplayRubrics.map(rubric => (
                            <div key={rubric.id} className="flex items-center justify-between gap-1">
                                <Button 
                                    variant={selectedRubricId === rubric.id ? "secondary" : "ghost"} 
                                    className="flex-1 justify-start h-auto text-left"
                                    onClick={() => setSelectedRubricId(rubric.id!)}
                                >
                                    <span className="py-1">{rubric.name}</span>
                                </Button>
                                {isAdmin && rubric.id !== defaultDetectionRubric.id ? (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the rubric "{rubric.name}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteRubric(rubric.id!, rubric.name)} className="bg-destructive hover:bg-destructive/90">
                                                    Yes, delete rubric
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                                        {rubric.id === defaultDetectionRubric.id && <Lock className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isAdmin && (
                            <div className="space-y-2 border-t pt-4 mt-4">
                                <Input 
                                    placeholder="New rubric name..." 
                                    value={newRubricName}
                                    onChange={(e) => setNewRubricName(e.target.value)}
                                />
                                <Button onClick={handleCreateRubric} disabled={isCreating} className="w-full">
                                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Create New Rubric
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                {selectedRubricId && selectedRubric ? (
                     <RubricEditor key={selectedRubricId} rubric={selectedRubric} />
                ) : (
                    <Card className="h-full flex items-center justify-center">
                        <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground">
                                <p className="text-lg font-semibold">Select a rubric</p>
                                <p>Choose a rubric from the list on the left to start editing, or create a new one.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function RubricEditor({ rubric }: { rubric: Rubric }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
    const isDefaultRubric = rubric.id === defaultDetectionRubric.id;

    const form = useForm<Rubric>({
        resolver: zodResolver(rubricSchema),
        defaultValues: rubric,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "phases",
    });

    const totalPoints = useWatch({ control: form.control, name: 'totalPoints' });
    const phases = useWatch({ control: form.control, name: 'phases' });
    const judgingInterface = useWatch({ control: form.control, name: 'judgingInterface' });

    const isDistributionEnabled = useMemo(() => {
        return judgingInterface === 'phases' && typeof totalPoints === 'number' && totalPoints > 0;
    }, [judgingInterface, totalPoints]);
    
    const pointBasedExerciseCount = useMemo(() => {
        if (judgingInterface !== 'phases') return 0;
        return phases.reduce((count, phase) => {
            return count + (phase.exercises?.filter(ex => ex.type === 'points' || (ex.type === 'pass/fail' && ex.maxPoints! > 0)).length || 0);
        }, 0);
    }, [phases, judgingInterface]);
    
    const pointsPerExercise = useMemo(() => {
        if (!isDistributionEnabled || pointBasedExerciseCount === 0) return null;
        return totalPoints! / pointBasedExerciseCount;
    }, [isDistributionEnabled, totalPoints, pointBasedExerciseCount]);

    useEffect(() => {
        if (isDistributionEnabled && pointsPerExercise !== null) {
            const currentPhases = form.getValues('phases');
            currentPhases.forEach((phase, phaseIndex) => {
                phase.exercises.forEach((exercise, exerciseIndex) => {
                     const ex = form.getValues(`phases.${phaseIndex}.exercises.${exerciseIndex}`);
                    if (ex.type === 'points' || (ex.type === 'pass/fail' && ex.maxPoints! > 0)) {
                        form.setValue(`phases.${phaseIndex}.exercises.${exerciseIndex}.maxPoints`, pointsPerExercise, { shouldDirty: true });
                    }
                });
            });
        }
    }, [pointsPerExercise, form, isDistributionEnabled]);

    useEffect(() => {
        form.reset(rubric);
        setOpenAccordionItems(rubric.phases?.map((_, index) => `item-${index}`) || []);
    }, [rubric, form]);

    async function onSubmit(data: Rubric) {
        if (!data.id || isDefaultRubric) return;
        setIsSubmitting(true);
        try {
            const rubricRef = doc(db, "rubrics", data.id);
            const dataToSave = { 
                name: data.name, 
                judgingInterface: data.judgingInterface,
                phases: data.judgingInterface === 'phases' ? data.phases : [], 
                totalPoints: data.judgingInterface === 'phases' ? data.totalPoints : null,
            };
            await updateDoc(rubricRef, dataToSave);
            toast({
                title: "Rubric Saved!",
                description: "The scoring rubric has been successfully updated.",
            });
            form.reset(data, { keepValues: true });
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
        <Card>
            <CardHeader>
                <CardTitle>Configure Rubric</CardTitle>
                <CardDescription>
                    Define the name, interface, and scoring rules for this rubric.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Rubric Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} readOnly={isDefaultRubric} />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="judgingInterface"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Judging Interface</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isDefaultRubric}>
                                         <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select interface" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="phases">Phases & Exercises</SelectItem>
                                            <SelectItem value="detection">Detection & Teamwork</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {judgingInterface === 'phases' && (
                          <>
                            <Separator />
                            <FormField
                                control={form.control}
                                name="totalPoints"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Total Available Points</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} placeholder="e.g., 100" onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ''} />
                                    </FormControl>
                                     <FormDescription>Points will be distributed among exercises.</FormDescription>
                                    </FormItem>
                                )}
                            />
                            {isDistributionEnabled && (
                                <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
                                Point distribution is active. Each of the <strong>{pointBasedExerciseCount}</strong> point-based & pass/fail exercises will be worth <strong>{pointsPerExercise?.toFixed(2) ?? 0}</strong> points.
                                </div>
                            )}
                            <Accordion type="multiple" className="w-full space-y-4" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
                                {fields.map((phase, phaseIndex) => (
                                    <AccordionItem key={phase.id || phaseIndex} value={`item-${phaseIndex}`} className="border rounded-lg bg-background">
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
                                        <PhaseExercises control={form.control} phaseIndex={phaseIndex} isDistributionEnabled={isDistributionEnabled} />
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
                                <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                                    <p className="font-semibold">No phases defined yet.</p>
                                    <p>Click "Add Phase" to get started building your scoring rubric.</p>
                                </div>
                            )}
                            <div className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => append({ name: "New Phase", exercises: [] })}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
                                </Button>
                            </div>
                          </>
                        )}
                        {judgingInterface === 'detection' && (
                            <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md space-y-2">
                                <p>The <strong>Detection & Teamwork</strong> interface uses a fixed scoring model:</p>
                                <ul className="list-disc pl-5">
                                    <li>**Detection Score:** Based on number of aids found.</li>
                                    <li>**Teamwork Score:** Based on deductions.</li>
                                    <li>**False Alerts:** Configurable point penalty per alert.</li>
                                </ul>
                                <p>The point values for these are configured in the scoring interface, not in the rubric.</p>
                            </div>
                        )}
                        
                        {!isDefaultRubric && (
                            <div className="flex justify-end items-center mt-6">
                                <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Rubric
                                </Button>
                            </div>
                        )}
                         {isDefaultRubric && (
                            <div className="flex justify-end items-center mt-6">
                                <Button type="submit" disabled>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Default Rubric (Cannot be saved)
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function PhaseExercises({ control, phaseIndex, isDistributionEnabled }: { control: any, phaseIndex: number, isDistributionEnabled: boolean }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `phases.${phaseIndex}.exercises`,
  });

  return (
    <div className="space-y-4 pl-8 border-l ml-2">
      {fields.map((exercise, exerciseIndex) => (
        <ExerciseItem 
            key={exercise.id || exerciseIndex} 
            control={control} 
            phaseIndex={phaseIndex} 
            exerciseIndex={exerciseIndex} 
            remove={remove}
            isDistributionEnabled={isDistributionEnabled}
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

function ExerciseItem({ control, phaseIndex, exerciseIndex, remove, isDistributionEnabled }: { control: any, phaseIndex: number, exerciseIndex: number, remove: (index: number) => void, isDistributionEnabled: boolean}) {
    const exerciseType = useWatch({
        control,
        name: `phases.${phaseIndex}.exercises.${exerciseIndex}.type`,
    });
     const exerciseValue = useWatch({
        control,
        name: `phases.${phaseIndex}.exercises.${exerciseIndex}`,
    });

    const showMaxPoints = exerciseType === 'points' || (exerciseType === 'pass/fail' && (!exerciseValue?.maxPoints || exerciseValue.maxPoints > 0));
    const showPenalty = exerciseType === 'pass/fail' && exerciseValue?.maxPoints && exerciseValue.maxPoints < 0;

    
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
                {(showMaxPoints || showPenalty) && (
                    <FormField
                      control={control}
                      name={`phases.${phaseIndex}.exercises.${exerciseIndex}.maxPoints`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>{showPenalty ? 'Time Penalty (seconds)' : 'Max Points'}</FormLabel>
                          <FormControl>
                            <Input 
                                {...field} 
                                type="number" 
                                placeholder={showPenalty ? "-10" : "10"}
                                readOnly={isDistributionEnabled && !showPenalty}
                                className={cn(isDistributionEnabled && !showPenalty ? 'bg-muted/70' : '', showPenalty ? 'border-destructive' : '')}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                )}
                 {exerciseType === 'time' && (
                     <FormItem className="w-full">
                        <FormLabel>Score Input</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Time in seconds" readOnly />
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
