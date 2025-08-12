
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, getDocs, deleteDoc, writeBatch, query, where, setDoc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Gavel, Loader2, Play, Square, TimerIcon, Plus, Minus, Trash2, MessageSquarePlus, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

const deductionCategories = [
    {
        category: "Handler–Dog Communication Breakdowns",
        items: [
            "Delayed responses to commands",
            "Misinterpreted commands",
            "Handler over-commanding",
            "Conflicting signals (body/voice)",
            "Handler talking over the dog’s work",
            "Tone mismatches",
        ]
    },
    {
        category: "Lack of Cohesion in Movement",
        items: [
            "Dog forges/lags/drifts",
            "Frequent tight leash corrections",
            "Dog crosses handler path unexpectedly",
            "Handler out of sync with dog’s pace",
            "Overhandling/micromanaging",
            "Dog physically collides with handler",
        ]
    },
    {
        category: "Search / Task Flow Disruptions",
        items: [
            "Handler pulls dog off productive work",
            "Dog ignores handler redirection",
            "Handler misses dog’s change of behavior",
            "Dog abandons task to look to handler",
            "Overdependence on handler guidance",
        ]
    },
    {
        category: "Emotional Disconnection",
        items: [
            "Dog shows stress signals toward handler",
            "Handler shows visible frustration",
            "Dog avoids eye contact or engagement",
            "Loss of enthusiasm in dog",
            "Handler fails to praise/reinforce",
        ]
    },
    {
        category: "Overt Handler Errors",
        items: [
            "Incorrect reward timing",
            "Inconsistent cues",
            "Handler positioning blocks dog",
            "Failure to read environmental stressors",
            "Stepping into dog’s path",
            "Not allowing sufficient lead length",
        ]
    },
    {
        category: "Breaks in Handler Trust / Leadership",
        items: [
            "Handler ignores dog’s problem-solving",
            "Dog second-guesses handler commands",
            "Inappropriate or harsh corrections",
            "Handler safety violations",
            "Dog hesitates to commit",
        ]
    },
    {
        category: "Ring / Field Awareness Lapses",
        items: [
            "Dog distracted, not refocused",
            "Handler steps outside boundaries",
            "Dog breaks formation without recall",
            "Handler fails to maintain situational awareness",
            "Mismatched start or stop timing",
        ]
    },
    {
        category: "Presentation & Professionalism Issues",
        items: [
            "Sloppy transitions between exercises",
            "Handler posture conveys uncertainty",
            "Unpreparedness (fumbling equipment)",
            "Dog out of position at start/finish",
            "Lack of confident entry/exit",
        ]
    }
];


const two = (n: number) => Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

type RunData = {
  id: string;
  detectionMax?: number;
  teamworkMax?: number;
  aidsPlanted?: number;
  falseAlertPenalty?: number;
  falseAlerts?: number;
  startAt?: any; // Firestore Timestamp
  endAt?: any;   // Firestore Timestamp
  status: "scheduled" | "in_progress" | "scored" | "locked";
  competitorId?: string;
  arenaId?: string;
  judgeName?: string;
  totalTime?: number;
};

type Find = { id: string; createdAt?: any };
type Deduction = { id: string; points: number; note: string; createdAt?: any };

function formatClock(s: number) {
    if (!Number.isFinite(s)) return '00:00';
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
};

export default function JudgingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  const eventId = params.id as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<RunData | null>(null);
  const [finds, setFinds] = useState<Find[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [arenaData, setArenaData] = useState<any>(null);

  const tickRef = useRef<number | null>(null);
  
  const isReadOnly = useMemo(() => {
      if (!run) return true;
      if (isAdmin) return false;
      return run.status === 'scored' || run.status === 'locked';
  }, [run, isAdmin]);

  // --- Data Fetching ---
  useEffect(() => {
    if (!eventId || !runId) return;
    
    const runRef = doc(db, `events/${eventId}/runs`, runId);
    
    const unsubRun = onSnapshot(runRef, async (s) => {
        if (!s.exists()) {
            const oldRunRef = doc(db, `events/${eventId}/schedule`, runId);
            const oldRunSnap = await getDoc(oldRunRef);
            if (oldRunSnap.exists()) {
                const oldData = oldRunSnap.data();
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                const eventData = eventSnap.data();
                
                const newRunData: RunData = {
                    ...oldData,
                    status: oldData.status === 'scored' ? 'scored' : 'scheduled',
                    detectionMax: eventData?.detectionMax || 75,
                    teamworkMax: eventData?.teamworkMax || 25,
                    aidsPlanted: oldData?.aidsPlanted || 5,
                    falseAlertPenalty: eventData?.falseAlertPenalty || 5,
                    falseAlerts: 0,
                };
                await setDoc(runRef, newRunData);
            } else {
                 toast({ variant: "destructive", title: "Error", description: "Run not found." });
                 router.push(`/dashboard/events/${eventId}/schedule`);
                 return;
            }
        }
        const runData = { id: s.id, ...s.data() } as RunData;
        setRun(runData);

        if (runData.competitorId && (!competitorData || competitorData.id !== runData.competitorId)) {
            const competitorSnap = await getDoc(doc(db, `events/${eventId}/competitors`, runData.competitorId));
            if(competitorSnap.exists()) setCompetitorData({id: competitorSnap.id, ...competitorSnap.data()});
        }
        if (runData.arenaId && (!arenaData || arenaData.id !== runData.arenaId)) {
            const arenaSnap = await getDoc(doc(db, `events/${eventId}/arenas`, runData.arenaId));
            if(arenaSnap.exists()) setArenaData({id: arenaSnap.id, ...arenaSnap.data()});
        }
        setLoading(false);
    });

    const unsubFinds = onSnapshot(query(collection(runRef, "finds"), orderBy("createdAt", "asc")), s => {
        setFinds(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    });
    
    const unsubDeductions = onSnapshot(query(collection(runRef, "deductions"), orderBy("createdAt", "asc")), s => {
        setDeductions(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    });

    return () => { unsubRun(); unsubFinds(); unsubDeductions(); };
  }, [eventId, runId, router, toast, competitorData, arenaData]);

  // --- Timer Logic ---
  useEffect(() => {
    if (run?.status === "in_progress") {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 200);
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [run?.status]);

  // --- Scoring Calculations ---
  const perAid = useMemo(() => {
    if (!run?.aidsPlanted || !run.detectionMax) return 0;
    return run.aidsPlanted > 0 ? run.detectionMax / run.aidsPlanted : 0;
  }, [run]);
  
  const deductionsTotal = useMemo(() => deductions.reduce((sum, d) => sum + d.points, 0), [deductions]);

  const detectionScore = useMemo(() => two(Math.min(finds.length, run?.aidsPlanted || 0) * perAid), [finds, run, perAid]);
  const teamworkScore = useMemo(() => two(clamp((run?.teamworkMax || 0) - deductionsTotal, 0, run?.teamworkMax || 0)), [run, deductionsTotal]);
  const falseTotal = useMemo(() => two((run?.falseAlerts || 0) * (run?.falseAlertPenalty || 0)), [run]);
  const preliminary = useMemo(() => two(detectionScore + teamworkScore), [detectionScore, teamworkScore]);
  const totalMax = (run?.detectionMax || 0) + (run?.teamworkMax || 0);
  const totalScore = useMemo(() => two(clamp(preliminary - falseTotal, 0, totalMax)), [preliminary, falseTotal, totalMax]);

  const elapsed = useMemo(() => {
    if (!run?.startAt) return 0;
    const startMs = run.startAt.toMillis ? run.startAt.toMillis() : Date.parse(run.startAt);
    const endMs = run?.endAt ? (run.endAt.toMillis ? run.endAt.toMillis() : Date.parse(run.endAt)) : now;
    return Math.max(Math.floor((endMs - startMs) / 1000), 0);
  }, [run?.startAt, run?.endAt, now]);
  
  const getRelativeTime = useCallback((timestamp: any) => {
    if (!timestamp || !run?.startAt) return null;
    const startMs = run.startAt.toMillis ? run.startAt.toMillis() : Date.parse(run.startAt);
    const eventMs = timestamp.toMillis ? timestamp.toMillis() : Date.parse(timestamp);
    return Math.max(Math.floor((eventMs - startMs) / 1000), 0);
  }, [run?.startAt]);

  // --- Actions ---
  const runRef = doc(db, `events/${eventId}/runs`, runId);

  const startRun = async () => {
      if(isReadOnly || run?.status !== 'scheduled') return;
      await updateDoc(runRef, { status: "in_progress", startAt: serverTimestamp(), actualStartTime: serverTimestamp() });
  };
  const endRun = async () => {
      if(isReadOnly || run?.status !== 'in_progress') return;
      const oldRunRef = doc(db, `events/${eventId}/schedule`, runId);
      await updateDoc(runRef, { status: "scored", endAt: serverTimestamp(), totalTime: elapsed });
      await updateDoc(oldRunRef, { status: "scored", totalTime: elapsed, actualStartTime: run?.startAt, scores: [] });
  };
  const addFind = async () => {
      if(isReadOnly || run?.status !== 'in_progress') return;
      await addDoc(collection(runRef, "finds"), { createdAt: serverTimestamp() });
  };
  const addFalseAlert = async (delta: number) => {
      if(isReadOnly) return;
      const next = Math.max((run?.falseAlerts || 0) + delta, 0);
      await updateDoc(runRef, { falseAlerts: next });
  };
  
   const changeAidsPlanted = async (delta: number) => {
      if (isReadOnly || run?.status !== 'scheduled') return;
      const next = Math.max((run?.aidsPlanted || 0) + delta, 0);
      await updateDoc(runRef, { aidsPlanted: next });
    };

  const handleDeductionChange = async (checked: boolean, note: string) => {
    if (isReadOnly || run?.status !== 'in_progress') return;
    
    if (checked) {
      // Add a deduction
      await addDoc(collection(runRef, "deductions"), {
        points: 1,
        note: note,
        createdAt: serverTimestamp(),
      });
    } else {
      // Remove a deduction with a matching note
      const existing = deductions.find(d => d.note === note);
      if (existing) {
        await deleteDoc(doc(runRef, "deductions", existing.id));
      }
    }
  };


  if (loading || !run) {
      return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-64 w-full" />
        </div>
      )
  }
  
  const canStartRun = !isReadOnly && run.status === 'scheduled';
  const canStopRun = !isReadOnly && run.status === 'in_progress';
  const existingDeductionNotes = new Set(deductions.map(d => d.note));

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}/schedule`}>
                <ChevronLeft className="h-4 w-4" />
            </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-semibold">Scoring Interface</h1>
                <p className="text-muted-foreground">
                    {competitorData?.name || '...'} with {competitorData?.dogName || '...'} in {arenaData?.name || '...'}
                </p>
            </div>
      </div>
      
      {/* Timer Card */}
       <Card className={cn(canStopRun && "bg-destructive/5 border-destructive/20")}>
          <CardContent className="pt-6 flex items-center justify-center gap-4 md:gap-8">
              <div className="font-mono text-6xl md:text-7xl font-bold text-primary tracking-tighter flex items-center gap-3">
                  <TimerIcon className="h-12 w-12 text-muted-foreground" />
                  {formatClock(elapsed)}
              </div>
              {canStopRun ? (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button size="lg" variant="destructive" className="w-40 h-16 text-lg animate-pulse" disabled={!canStopRun}>
                              <Square className="mr-2 h-6 w-6"/> Stop
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>End Run?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This will stop the timer and finalize the run. You can still edit scores after ending the run.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={endRun}>Yes, End Run</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              ) : (
                  <Button onClick={startRun} disabled={!canStartRun} size="lg" className="w-40 h-16 text-lg bg-green-600 hover:bg-green-700">
                      <Play className="mr-2 h-6 w-6"/> Start
                  </Button>
              )}
          </CardContent>
      </Card>
      
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
           <div className="text-center md:text-left">
                 <CardDescription className="text-sm flex items-center justify-center md:justify-start gap-4 mt-1">
                    <span>Per Aid: {two(perAid)} pts</span>
                    <span className="flex items-center gap-2">
                        Aids Planted: 
                        {run.status === 'scheduled' && !isReadOnly ? (
                             <span className="flex items-center gap-1">
                                <Button onClick={() => changeAidsPlanted(-1)} variant="outline" size="icon" className="h-5 w-5 rounded-full"><Minus className="h-3 w-3" /></Button>
                                <span className="font-bold text-foreground w-4 text-center">{run.aidsPlanted}</span>
                                <Button onClick={() => changeAidsPlanted(1)} variant="outline" size="icon" className="h-5 w-5 rounded-full"><Plus className="h-3 w-3"/></Button>
                            </span>
                        ) : (
                             <span className="font-bold text-foreground">{run.aidsPlanted}</span>
                        )}
                    </span>
                     <span>False Alert: -{run.falseAlertPenalty || 0} pts</span>
                </CardDescription>
           </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle>Finds</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 items-center">
                <Button onClick={addFind} disabled={isReadOnly || run.status !== 'in_progress'} className="h-24 w-full text-lg">
                    Found Aid
                </Button>
                <div className="w-full">
                    <ul className="space-y-1 text-sm text-muted-foreground list-decimal pl-5">
                        {finds.map((f, i) => {
                            const relativeTime = getRelativeTime(f.createdAt);
                            return (
                                <li key={f.id} className="font-mono">
                                    Find #{i + 1} at {relativeTime !== null ? formatClock(relativeTime) : "pending..."}
                                    {i === 0 && <span className="ml-2 text-primary font-semibold">(first find)</span>}
                                </li>
                            )
                        })}
                        {finds.length === 0 && <li className="list-none -ml-5 text-center">No finds logged yet.</li>}
                    </ul>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>False Alerts</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => addFalseAlert(-1)} variant="outline" size="icon" className="h-12 w-12" disabled={isReadOnly}><Minus/></Button>
                    <span className="font-mono text-5xl font-bold w-24 text-center">{run.falseAlerts || 0}</span>
                    <Button onClick={() => addFalseAlert(1)} variant="outline" size="icon" className="h-12 w-12" disabled={isReadOnly}><Plus/></Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Penalty: {run.falseAlertPenalty || 0} pts each</p>
            </CardContent>
          </Card>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Teamwork Deductions</CardTitle>
              <CardDescription>Check items to apply a 1-point deduction.</CardDescription>
          </CardHeader>
          <CardContent>
              <Accordion type="multiple" className="w-full space-y-2">
                   {deductionCategories.map((cat, catIndex) => (
                       <AccordionItem value={`item-${catIndex}`} key={cat.category} className="border rounded-md px-4">
                          <AccordionTrigger>{cat.category}</AccordionTrigger>
                          <AccordionContent className="space-y-2 pt-2">
                               {cat.items.map(item => (
                                  <div key={item} className="flex items-center space-x-2 pl-2">
                                      <Checkbox 
                                          id={`deduction-${item.replace(/\s+/g, '-')}`}
                                          checked={existingDeductionNotes.has(item)}
                                          onCheckedChange={(checked) => handleDeductionChange(!!checked, item)}
                                          disabled={isReadOnly || run.status !== 'in_progress'}
                                      />
                                      <label
                                          htmlFor={`deduction-${item.replace(/\s+/g, '-')}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                         {item}
                                      </label>
                                  </div>
                               ))}
                          </AccordionContent>
                       </AccordionItem>
                   ))}
              </Accordion>
          </CardContent>
      </Card>
      
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-8 lg:-mb-8">
        <div className="max-w-4xl mx-auto p-4">
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                 <Stat label="Detection" value={`${detectionScore} / ${run.detectionMax || 0}`} />
                 <Stat label="Teamwork" value={`${teamworkScore} / ${run.teamworkMax || 0}`} />
                 <Stat label="Preliminary" value={`${preliminary}`} />
                 <Stat label="Minus False Alerts" value={`-${falseTotal}`} />
                 <Stat label="Total Score" value={`${totalScore} / ${totalMax}`} big />
             </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={cn("bg-muted/50 p-3 rounded-lg", big && "bg-primary/10 text-primary")}>
      <div className={cn("text-xs uppercase tracking-wider text-muted-foreground", big && "text-primary/80")}>{label}</div>
      <div className={cn("text-2xl font-bold", big && "text-3xl")}>{value}</div>
    </div>
  );
}

    