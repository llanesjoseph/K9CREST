
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, getDocs, deleteDoc, writeBatch, query, where, setDoc, getDoc, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Gavel, Loader2, Play, Square, TimerIcon, Plus, Minus, Trash2, MessageSquarePlus, ChevronDown, Save, CheckCircle } from "lucide-react";
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
  startAt?: Timestamp; // Firestore Timestamp
  endAt?: Timestamp;   // Firestore Timestamp
  status: "scheduled" | "in_progress" | "paused" | "scored" | "locked";
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

interface DetectionScoringProps {
    eventId: string;
    runId: string;
    isReadOnly: boolean;
}

export function DetectionScoring({ eventId, runId, isReadOnly }: DetectionScoringProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  const [run, setRun] = useState<RunData | null>(null);
  const [finds, setFinds] = useState<Find[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [arenaData, setArenaData] = useState<any>(null);

  const tickRef = useRef<number | null>(null);
  
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
    const startMs = run.startAt.toMillis();
    const endMs = run?.endAt ? run.endAt.toMillis() : now;
    return Math.max(Math.floor((endMs - startMs) / 1000), 0);
  }, [run?.startAt, run?.endAt, now]);
  
  const allAidsFound = useMemo(() => {
      if (!run) return false;
      return finds.length >= (run.aidsPlanted || 0);
  }, [finds, run]);

  const existingDeductionNotes = useMemo(() => new Set(deductions.map(d => d.note)), [deductions]);

  const getRelativeTime = useCallback((timestamp: any) => {
    if (!timestamp || !run?.startAt) return null;
    const startMs = run.startAt.toMillis ? run.startAt.toMillis() : Date.parse(run.startAt);
    const eventMs = timestamp.toMillis ? timestamp.toMillis() : Date.parse(timestamp);
    return Math.max(Math.floor((eventMs - startMs) / 1000), 0);
  }, [run?.startAt]);
  

  useEffect(() => {
    if (!eventId || !runId) return;
    
    const runRef = doc(db, `events/${eventId}/schedule`, runId);
    
    const unsubRun = onSnapshot(runRef, async (s) => {
        if (!s.exists()) {
            toast({ variant: "destructive", title: "Error", description: "Run not found." });
            router.push(`/dashboard/events/${eventId}/schedule`);
            return;
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
        setFinds(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    
    const unsubDeductions = onSnapshot(query(collection(runRef, "deductions"), orderBy("createdAt", "asc")), s => {
        setDeductions(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => { unsubRun(); unsubFinds(); unsubDeductions(); };
  }, [eventId, runId, router, toast, competitorData, arenaData]);

  useEffect(() => {
    if (run?.status === "in_progress") {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 200);
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [run?.status]);

  const runRef = doc(db, `events/${eventId}/schedule`, runId);

  const startRun = async () => {
      if(run?.status !== 'scheduled' || isReadOnly) return;
      await updateDoc(runRef, { status: "in_progress", startAt: serverTimestamp(), actualStartTime: serverTimestamp(), endAt: null });
  };
  
  const stopRun = async () => {
      if(run?.status !== 'in_progress' || isReadOnly) return;
      await updateDoc(runRef, { status: "paused", endAt: serverTimestamp() });
  };

   const submitScores = async () => {
      if(run?.status !== 'paused' || isReadOnly) return;
      
      let finalTime = run?.totalTime || 0;
      if (run?.startAt && run.endAt) {
          finalTime = (run.endAt.toMillis() - run.startAt.toMillis()) / 1000;
      }
      
      await updateDoc(runRef, { status: "scored", totalTime: finalTime });
      toast({ title: "Scores Submitted", description: "The final scores have been saved." });
  };

  const addFind = async () => {
      if(run?.status !== 'in_progress' || isReadOnly) return;
      if (finds.length >= (run?.aidsPlanted || Infinity)) {
          toast({ variant: 'default', title: 'All aids found' });
          return;
      }
      await addDoc(collection(runRef, "finds"), { createdAt: serverTimestamp() });
  };
  const addFalseAlert = async (delta: number) => {
      if(isReadOnly) return;
      const next = Math.max((run?.falseAlerts || 0) + delta, 0);
      await updateDoc(runRef, { falseAlerts: next });
  };
  
   const changeAidsPlanted = async (delta: number) => {
      if (run?.status !== 'scheduled' || isReadOnly) return;
      const next = Math.max((run?.aidsPlanted || 0) + delta, 0);
      await updateDoc(runRef, { aidsPlanted: next });
    };

  const handleDeductionChange = async (checked: boolean, note: string) => {
    if (!['in_progress', 'paused'].includes(run?.status || '') || isReadOnly) return;
    
    if (checked) {
      await addDoc(collection(runRef, "deductions"), { points: 1, note: note, createdAt: serverTimestamp() });
    } else {
      const existing = deductions.find(d => d.note === note);
      if (existing) {
        await deleteDoc(doc(runRef, "deductions", existing.id));
      }
    }
  };

  if (loading || !run) {
      return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-64 w-full" />
        </div>
      )
  }
  
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-48">
        <p className="text-muted-foreground">
            Scoring for {competitorData?.name || '...'} with {competitorData?.dogName || '...'} in {arenaData?.name || '...'}
        </p>
      
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn("transition-all", allAidsFound && "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800")}>
            <CardHeader className="py-2">
                <CardTitle className="text-base">Finds</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-2 pt-0">
                {allAidsFound ? (
                     <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <p className="mt-2 font-medium text-green-700 dark:text-green-300">All aids found!</p>
                     </div>
                ) : (
                    <>
                    <Button onClick={addFind} disabled={isReadOnly || run.status !== 'in_progress'} size="sm">
                        Log Find ({finds.length}/{run.aidsPlanted})
                    </Button>
                    <div className="w-full min-h-[40px]">
                        <ul className="space-y-1 text-xs text-muted-foreground list-decimal pl-4">
                            {finds.map((f, i) => {
                                const relativeTime = getRelativeTime(f.createdAt);
                                return (
                                    <li key={f.id} className="font-mono">
                                        Find #{i + 1} at {relativeTime !== null ? formatClock(relativeTime) : "pending..."}
                                    </li>
                                )
                            })}
                            {finds.length === 0 && <li className="list-none -ml-4 text-center text-xs pt-2">No finds logged.</li>}
                        </ul>
                    </div>
                    </>
                )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-2">
                <CardTitle className="text-base">False Alerts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-2">
                <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => addFalseAlert(-1)} variant="outline" size="icon" className="h-8 w-8" disabled={isReadOnly}><Minus/></Button>
                    <span className="font-mono text-3xl font-bold w-12 text-center">{run.falseAlerts || 0}</span>
                    <Button onClick={() => addFalseAlert(1)} variant="outline" size="icon" className="h-8 w-8" disabled={isReadOnly}><Plus/></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">Penalty: {run.falseAlertPenalty || 0} pts each</p>
            </CardContent>
          </Card>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Teamwork Deductions</CardTitle>
              <CardDescription>Check items to apply a 1-point deduction.</CardDescription>
          </CardHeader>
          <CardContent className="p-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-1 gap-y-1">
                   {deductionCategories.map((cat) => (
                       <div key={cat.category} className="border rounded-md p-2 space-y-1">
                          <h4 className="font-semibold text-sm mb-1 px-1">{cat.category}</h4>
                          <div className="space-y-1">
                               {cat.items.map((item) => (
                                  <div key={item} className="flex items-center space-x-2 p-1 rounded-sm hover:bg-muted">
                                      <Checkbox 
                                          id={`deduction-${item.replace(/\s+/g, '-')}`}
                                          checked={existingDeductionNotes.has(item)}
                                          onCheckedChange={(checked) => handleDeductionChange(!!checked, item)}
                                          disabled={isReadOnly || !['in_progress', 'paused'].includes(run.status)}
                                      />
                                      <label
                                          htmlFor={`deduction-${item.replace(/\s+/g, '-')}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                         {item}
                                      </label>
                                  </div>
                               ))}
                          </div>
                       </div>
                   ))}
              </div>
          </CardContent>
      </Card>
      
      <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-background/95 backdrop-blur-sm border-t">
              <div className="max-w-4xl mx-auto p-2 px-4 sm:px-6 lg:px-8">
                   <div className="flex items-center justify-between gap-4">
                      {/* Left Side: Actions */}
                      <div className="flex items-center gap-2">
                          <div className="font-mono text-base font-bold text-primary tracking-tighter flex items-center gap-2">
                              <TimerIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="w-14">{formatClock(elapsed)}</span>
                          </div>
                           {run.status === 'scheduled' && (
                              <Button onClick={startRun} size="sm" className="h-8 bg-green-600 hover:bg-green-700" disabled={isReadOnly}>
                                  <Play className="mr-2 h-4 w-4"/> Start
                              </Button>
                          )}
                          {run.status === 'in_progress' && (
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="destructive" className="h-8" disabled={isReadOnly}>
                                          <Square className="mr-2 h-4 w-4"/> Stop
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Stop Timer?</AlertDialogTitle><AlertDialogDescription>This will stop the timer and lock the final time for this run.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={stopRun}>Yes, Stop Timer</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          )}
                          {run.status === 'paused' && (
                            <Button onClick={submitScores} className="h-8" size="sm" disabled={isReadOnly}>
                                <Save className="mr-2 h-4 w-4"/> Submit
                            </Button>
                          )}
                      </div>

                      {/* Right Side: Scores */}
                      <div className="flex items-center gap-2 md:gap-3">
                          <Stat label="Detection" value={`${detectionScore} / ${run.detectionMax || 0}`} />
                          <Stat label="Teamwork" value={`${teamworkScore} / ${run.teamworkMax || 0}`} />
                          <Stat label="Preliminary" value={`${preliminary}`} />
                          <Stat label="Minus False" value={`-${falseTotal}`} />
                          <div className="h-6 w-px bg-border mx-1"></div>
                          <Stat label="Total Score" value={`${totalScore} / ${totalMax}`} big />
                      </div>
                  </div>
              </div>
          </div>
        </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={cn("text-center", big && "bg-primary/10 text-primary py-1 px-2 rounded-md")}>
      <div className={cn("text-[10px] uppercase tracking-wider text-muted-foreground", big && "text-primary/80")}>{label}</div>
      <div className={cn("text-xs font-bold", big && "text-base")}>{value}</div>
    </div>
  );
}
