"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Trash2, GripVertical, CheckCircle, XCircle, Loader2, Save, Lock, FileText, Target, Timer } from "lucide-react";
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
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, writeBatch } from "firebase/firestore";
import { auth } from "@/lib/firebase";
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
import { Badge } from "@/components/ui/badge";

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

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'points': return Target;
    case 'time': return Timer;
    case 'pass/fail': return CheckCircle;
    default: return FileText;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'points': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'time': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'pass/fail': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
};

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

            if (isLoading && isAdmin) {
                seedDefaultRubrics(rubricsData);
            }

            setIsLoading(false);
        });
        return () => unsub();
    }, [isLoading, seedDefaultRubrics, isAdmin]);

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
            const token = await (await auth.currentUser?.getIdToken())!;
            const res = await fetch(`/api/rubrics/${rubricId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(await res.text());
            toast({ title: "Rubric Deleted", description: `Rubric "${rubricName}" has been deleted.` });
            if(selectedRubricId === rubricId) setSelectedRubricId(null);
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
        return (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Loading scoring rubrics...</p>
          </div>
        );
    }

    return (
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Scoring Rubrics</h1>
            <p className="text-lg text-muted-foreground">Create and manage scoring criteria for your events</p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Rubric Library - Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3">
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Rubric Library
                  </CardTitle>
                  <CardDescription>Select a rubric to view or edit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Rubric List */}
                  <div className="space-y-2">
                    {allDisplayRubrics.map(rubric => (
                      <div key={rubric.id} className="group">
                        <Button
                          variant={selectedRubricId === rubric.id ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-between h-auto p-4 text-left transition-all duration-200",
                            selectedRubricId === rubric.id
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedRubricId(rubric.id!)}
                        >
                          <div className="flex flex-col items-start space-y-1">
                            <span className="font-medium truncate">{rubric.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  rubric.judgingInterface === 'detection'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                )}
                              >
                                {rubric.judgingInterface === 'detection' ? 'Detection' : 'Phases'}
                              </Badge>
                              {rubric.totalPoints && (
                                <span className="text-xs text-muted-foreground">
                                  {rubric.totalPoints} pts
                                </span>
                              )}
                            </div>
                          </div>
                          {isAdmin && rubric.id !== defaultDetectionRubric.id ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Rubric</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{rubric.name}&quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRubric(rubric.id!, rubric.name)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : rubric.id === defaultDetectionRubric.id ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : null}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Create New Rubric */}
                  {isAdmin && (
                    <div className="pt-4 border-t space-y-3">
                      <div className="space-y-2">
                        <Input
                          placeholder="Enter rubric name..."
                          value={newRubricName}
                          onChange={(e) => setNewRubricName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateRubric()}
                        />
                        <Button
                          onClick={handleCreateRubric}
                          disabled={isCreating || !newRubricName.trim()}
                          className="w-full"
                          size="sm"
                        >
                          {isCreating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PlusCircle className="mr-2 h-4 w-4" />
                          )}
                          Create New Rubric
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rubric Editor - Main Content */}
            <div className="lg:col-span-8 xl:col-span-9">
              {selectedRubricId && selectedRubric ? (
                <RubricEditor key={selectedRubricId} rubric={selectedRubric} />
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent className="text-center space-y-4">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Select a Rubric</h3>
                      <p className="text-muted-foreground max-w-md">
                        Choose a rubric from the library to view details and configure scoring criteria.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
    );
}

function RubricEditor({ rubric }: { rubric: Rubric }) {
    const { toast } = useToast();
    const { isAdmin } = useAuth();
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
        if (!data.id || isDefaultRubric || !isAdmin) return;

        if (!data.name || data.name.trim() === '') {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Rubric name is required."
            });
            return;
        }

        if (data.judgingInterface === 'phases') {
            if (!data.phases || data.phases.length === 0) {
                toast({
                    variant: "destructive",
                    title: "Validation Error",
                    description: "At least one phase is required for phase-based rubrics."
                });
                return;
            }

            for (const phase of data.phases) {
                if (!phase.name || phase.name.trim() === '') {
                    toast({
                        variant: "destructive",
                        title: "Validation Error",
                        description: "All phases must have names."
                    });
                    return;
                }

                if (!phase.exercises || phase.exercises.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Validation Error",
                        description: `Phase "${phase.name}" must have at least one exercise.`
                    });
                    return;
                }

                for (const exercise of phase.exercises) {
                    if (!exercise.name || exercise.name.trim() === '') {
                        toast({
                            variant: "destructive",
                            title: "Validation Error",
                            description: `All exercises in phase "${phase.name}" must have names.`
                        });
                        return;
                    }

                    if (exercise.type === 'points' && (!exercise.maxPoints || exercise.maxPoints <= 0)) {
                        toast({
                            variant: "destructive",
                            title: "Validation Error",
                            description: `Exercise "${exercise.name}" must have a positive maximum points value.`
                        });
                        return;
                    }
                }
            }
        }

        setIsSubmitting(true);
        try {
            const rubricRef = doc(db, "rubrics", data.id);
            const dataToSave = {
                name: data.name.trim(),
                judgingInterface: data.judgingInterface,
                phases: data.judgingInterface === 'phases' ? data.phases : [],
                totalPoints: data.judgingInterface === 'phases' ? data.totalPoints : undefined,
                updatedAt: new Date(),
            };

            await updateDoc(rubricRef, dataToSave);

            toast({
                title: "Rubric Saved!",
                description: "The scoring rubric has been successfully updated.",
            });

            form.reset(dataToSave, { keepValues: true });
        } catch (error) {
            console.error('Failed to save rubric:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save the rubric. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">{rubric.name}</CardTitle>
                    <CardDescription>
                      Configure scoring criteria and exercise parameters
                    </CardDescription>
                  </div>
                  {!isDefaultRubric && (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={form.handleSubmit(onSubmit)}
                      className="shrink-0"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Basic Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-base font-medium">Rubric Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} readOnly={isDefaultRubric} className="h-12" />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="judgingInterface"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-base font-medium">Judging Interface</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isDefaultRubric}>
                                         <FormControl>
                                            <SelectTrigger className="h-12">
                                              <SelectValue placeholder="Select interface" />
                                            </SelectTrigger>
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
                          <div className="space-y-6">
                            <Separator />

                            {/* Total Points */}
                            <FormField
                                control={form.control}
                                name="totalPoints"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="text-base font-medium">Total Available Points</FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          {...field}
                                          placeholder="e.g., 100"
                                          className="h-12 max-w-xs"
                                          onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                          value={field.value ?? ''}
                                        />
                                    </FormControl>
                                     <FormDescription>Points will be distributed equally among all point-based exercises.</FormDescription>
                                    </FormItem>
                                )}
                            />

                            {/* Point Distribution Info */}
                            {isDistributionEnabled && (
                                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                                    <Target className="h-5 w-5" />
                                    <span className="font-medium">Point Distribution Active</span>
                                  </div>
                                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                    Each of the <strong>{pointBasedExerciseCount}</strong> point-based exercises will be worth <strong>{pointsPerExercise?.toFixed(2) ?? 0}</strong> points.
                                  </p>
                                </div>
                            )}

                            {/* Phases */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Phases & Exercises</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => append({ name: "New Phase", exercises: [] })}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
                                </Button>
                              </div>

                              {fields.length === 0 ? (
                                <Card className="border-dashed border-2 py-12">
                                  <CardContent className="text-center space-y-3">
                                    <Target className="h-12 w-12 text-muted-foreground mx-auto" />
                                    <div className="space-y-1">
                                      <p className="font-medium text-lg">No phases defined</p>
                                      <p className="text-muted-foreground">Add a phase to start building your scoring rubric</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ) : (
                                <Accordion type="multiple" className="space-y-4" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
                                    {fields.map((phase, phaseIndex) => (
                                        <AccordionItem key={phase.id || phaseIndex} value={`item-${phaseIndex}`} className="border rounded-lg bg-muted/20">
                                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                                <div className="flex items-center gap-4 flex-grow text-left">
                                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                    <FormField
                                                        control={form.control}
                                                        name={`phases.${phaseIndex}.name`}
                                                        render={({ field }) => (
                                                          <Input
                                                            {...field}
                                                            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                                                            onClick={(e) => e.stopPropagation()}
                                                          />
                                                        )}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive ml-auto"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          remove(phaseIndex);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pb-6">
                                            <PhaseExercises control={form.control} phaseIndex={phaseIndex} isDistributionEnabled={isDistributionEnabled} />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                              )}
                            </div>
                          </div>
                        )}

                        {judgingInterface === 'detection' && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 space-y-4">
                                <div className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                                  <Target className="h-5 w-5" />
                                  <span className="font-semibold">Detection & Teamwork Interface</span>
                                </div>
                                <div className="space-y-3 text-sm text-orange-800 dark:text-orange-200">
                                    <p>This interface uses a specialized scoring model for detection work:</p>
                                    <ul className="space-y-2 ml-4">
                                        <li className="flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 shrink-0"></div>
                                          <span><strong>Detection Score:</strong> Based on number of aids found</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 shrink-0"></div>
                                          <span><strong>Teamwork Score:</strong> Based on performance deductions</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 shrink-0"></div>
                                          <span><strong>False Alerts:</strong> Configurable point penalty per alert</span>
                                        </li>
                                    </ul>
                                    <p className="pt-2 border-t border-orange-200 dark:border-orange-800">
                                      Point values are configured in the scoring interface during judging.
                                    </p>
                                </div>
                            </div>
                        )}

                         {isDefaultRubric && (
                            <div className="flex justify-center">
                                <Badge variant="secondary" className="px-4 py-2">
                                    <Lock className="mr-2 h-4 w-4" />
                                    Default Rubric - Cannot be modified
                                </Badge>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-muted-foreground">Exercises</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", type: "points", maxPoints: 10 })}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No exercises added yet. Click &quot;Add Exercise&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
        </div>
      )}
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
    const TypeIcon = getTypeIcon(exerciseType);

    return (
        <Card className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-grow space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={control}
                  name={`phases.${phaseIndex}.exercises.${exerciseIndex}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Exercise Name</FormLabel>
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
                      <FormLabel className="text-sm font-medium">Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="points">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Points
                            </div>
                          </SelectItem>
                          <SelectItem value="time">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4" />
                              Time
                            </div>
                          </SelectItem>
                          <SelectItem value="pass/fail">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Pass/Fail
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                    {(showMaxPoints || showPenalty) && (
                        <FormField
                          control={control}
                          name={`phases.${phaseIndex}.exercises.${exerciseIndex}.maxPoints`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {showPenalty ? 'Penalty Points' : 'Max Points'}
                              </FormLabel>
                              <FormControl>
                                <Input
                                    {...field}
                                    type="number"
                                    placeholder={showPenalty ? "-10" : "10"}
                                    readOnly={isDistributionEnabled && !showPenalty}
                                    className={cn(
                                      isDistributionEnabled && !showPenalty && 'bg-muted/70 cursor-not-allowed',
                                      showPenalty && 'border-destructive text-destructive'
                                    )}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                    )}
                     {exerciseType === 'time' && (
                         <FormItem>
                            <FormLabel className="text-sm font-medium">Score Input</FormLabel>
                            <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Time in seconds"
                                  readOnly
                                  className="bg-muted/70 cursor-not-allowed"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                </div>
              </div>

              {/* Exercise Type Badge */}
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", getTypeColor(exerciseType))}>
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {exerciseType}
                </Badge>
                {isDistributionEnabled && !showPenalty && exerciseType === 'points' && (
                  <Badge variant="outline" className="text-xs">
                    Auto-calculated
                  </Badge>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => remove(exerciseIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
    )
}