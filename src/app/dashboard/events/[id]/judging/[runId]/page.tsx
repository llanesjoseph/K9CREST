
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, getDocs, deleteDoc, writeBatch, query, where, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Gavel, Loader2, Play, Square, TimerIcon, Plus, Minus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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

type Deduction = { id: string; label: string; points: number; applied: boolean };
type Find = { id: string; createdAt?: any };

export default function JudgingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  const eventId = params.id as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<RunData | null>(null);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
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
    
    // This will become the new "run" document reference
    const runRef = doc(db, `events/${eventId}/runs`, runId);
    
    const unsubRun = onSnapshot(runRef, async (s) => {
        if (!s.exists()) {
            // Check the old location for compatibility
            const oldRunRef = doc(db, `events/${eventId}/schedule`, runId);
            const oldRunSnap = await getDoc(oldRunRef);
            if (oldRunSnap.exists()) {
                const oldData = oldRunSnap.data();
                // Migrate to new structure
                const newRunData = {
                    ...oldData, // Carry over essential fields
                    status: oldData.status === 'scored' ? 'scored' : 'scheduled',
                    detectionMax: 75, // Default value
                    teamworkMax: 25, // Default value
                    aidsPlanted: 5, // Default value
                    falseAlertPenalty: 5, // Default value
                    falseAlerts: 0,
                };
                await setDoc(runRef, newRunData);
                // Optionally delete the old one after migration if desired
                // await deleteDoc(oldRunRef);
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

    const unsubDed = onSnapshot(collection(runRef, "deductions"), s => 
        setDeductions(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    );

    const unsubFinds = onSnapshot(query(collection(runRef, "finds")), s => 
        setFinds(s.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
            .sort((a,b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
    ));
    
    return () => { unsubRun(); unsubDed(); unsubFinds(); };
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

  const detectionScore = useMemo(() => two(Math.min(finds.length, run?.aidsPlanted || 0) * perAid), [finds, run, perAid]);
  const deductionsTotal = useMemo(() => two(deductions.filter(d => d.applied).reduce((s, d) => s + (d.points || 0), 0)), [deductions]);
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
  
  const formatClock = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // --- Actions ---
  const runRef = doc(db, `events/${eventId}/runs`, runId);

  const startRun = async () => {
      if(isReadOnly) return;
      await updateDoc(runRef, { status: "in_progress", startAt: serverTimestamp(), actualStartTime: serverTimestamp() });
  };
  const endRun = async () => {
      if(isReadOnly) return;
      // Also update the old schedule item for leaderboard compatibility
      const oldRunRef = doc(db, `events/${eventId}/schedule`, runId);
      await updateDoc(runRef, { status: "scored", endAt: serverTimestamp(), totalTime: elapsed });
      await updateDoc(oldRunRef, { status: "scored", totalTime: elapsed, actualStartTime: run?.startAt, scores: [] }); // Empty scores to prevent double counting
  };
  const addFind = async () => {
      if(isReadOnly) return;
      await addDoc(collection(runRef, "finds"), { createdAt: serverTimestamp() });
  };
  const addFalseAlert = async (delta: number) => {
      if(isReadOnly) return;
      const next = Math.max((run?.falseAlerts || 0) + delta, 0);
      await updateDoc(runRef, { falseAlerts: next });
  };
  const setDeduction = async (id: string, patch: Partial<Deduction>) => {
      if(isReadOnly) return;
      await setDoc(doc(runRef, "deductions", id), patch, { merge: true });
  };
  const addDeductionRow = async () => {
    if(isReadOnly) return;
    await addDoc(collection(runRef, "deductions"), { label: "Custom deduction", points: 0, applied: false });
  };
   const removeDeductionRow = async (id: string) => {
    if(isReadOnly) return;
    await deleteDoc(doc(runRef, "deductions", id));
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
      
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
                <CardTitle>Live Scoring</CardTitle>
                <CardDescription className="text-sm">
                    Per Aid: {two(perAid)} pts &bull; Aids Planted: {run.aidsPlanted} &bull; False Alert: -{run.falseAlertPenalty} pts
                </CardDescription>
           </div>
           <div className="flex items-center gap-3">
                <div className="font-mono text-3xl font-bold text-primary tracking-tighter">
                    <TimerIcon className="inline h-6 w-6 mr-2" />
                    {formatClock(elapsed)}
                </div>
                {run.status !== "in_progress" ? (
                    <Button onClick={startRun} disabled={isReadOnly} className="w-28 bg-green-600 hover:bg-green-700">
                        <Play className="mr-2 h-4 w-4"/> Start
                    </Button>
                 ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="w-28" disabled={isReadOnly}><Square className="mr-2 h-4 w-4"/> End</Button>
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
                 )}
           </div>
        </CardHeader>
      </Card>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Finds</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
                    <Button onClick={addFind} disabled={isReadOnly || run.status !== 'in_progress'} className="h-24 w-full sm:w-48 text-lg">
                        Found Aid
                    </Button>
                    <div className="flex-grow w-full">
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                            {finds.map((f, i) => (
                                <li key={f.id} className="font-mono">
                                    {f.createdAt?.toDate?.().toLocaleTimeString?.() || "pending..."}
                                    {i === 0 && <span className="ml-2 text-primary font-semibold">(first find)</span>}
                                </li>
                            ))}
                            {finds.length === 0 && <li>No finds logged yet.</li>}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Teamwork Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                         {deductions.map(d => (
                            <div key={d.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                               <Checkbox 
                                    checked={!!d.applied} 
                                    onCheckedChange={c => setDeduction(d.id, { applied: !!c })} 
                                    disabled={isReadOnly}
                                />
                               <Input 
                                    value={d.label} 
                                    onChange={e => setDeduction(d.id, { label: e.target.value })} 
                                    placeholder="Deduction reason..."
                                    className="h-9"
                                    readOnly={isReadOnly}
                                />
                               <Input 
                                    type="number" 
                                    min={0} value={d.points || 0} 
                                    onChange={e => setDeduction(d.id, { points: Number(e.target.value) || 0 })} 
                                    className="w-24 h-9 text-right"
                                    readOnly={isReadOnly}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDeductionRow(d.id)} disabled={isReadOnly}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                         ))}
                    </div>
                    {!isReadOnly && <Button onClick={addDeductionRow} variant="outline" size="sm" className="mt-4" disabled={isReadOnly}>
                        <Plus className="mr-2 h-4 w-4" /> Add Deduction
                    </Button>}
                </CardContent>
            </Card>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
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
      </div>
      
      {/* Sticky Footer */}
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

    