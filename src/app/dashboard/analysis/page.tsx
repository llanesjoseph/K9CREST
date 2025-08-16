"use client";

import { useState, useEffect } from "react";
import type { DocumentData, Timestamp } from "firebase/firestore";
import { collection, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, BarChart2, Hourglass, UserCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area } from 'recharts';
import { differenceInMinutes, parse, format, eachMinuteOfInterval, addMinutes, startOfDay, endOfDay } from "date-fns";
import type { ScheduledEvent } from "@/lib/schedule-types";


interface Event {
    id: string;
    name: string;
    startDate?: Timestamp;
    endDate?: Timestamp;
}

interface RunData {
    id:string;
    scheduledTime: string;
    scheduledDateTime: Date;
    actualStartTime?: Timestamp | null;
    actualStartTimeDate?: Date;
    actualEndTimeDate?: Date;
    judgeName?: string | null;
    arenaName?: string | null;
    arenaId: string;
    competitorName?: string;
    startVariance?: number;
    totalTime?: number | null;
}

interface PacingDataPoint {
    time: string;
    scheduledPercent: number;
    actualPercent: number;
}

interface AnalysisData {
    totalRuns: number;
    onTimeRuns: number;
    avgDelay: number;
    totalOverrun: number;
    totalTurnaroundTime: number;
    turnaroundCount: number;
    byArena: Record<string, { totalDelay: number; count: number; totalTurnaround: number; turnaroundCount: number; }>;
    byJudge: Record<string, { totalDelay: number; count: number; }>;
    runs: (RunData & { startVariance: number; actualStartTimeDate: Date })[];
    pacingData: PacingDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const scheduled = payload.find((p: any) => p.dataKey === 'scheduledPercent')?.value;
    const actual = payload.find((p: any) => p.dataKey === 'actualPercent')?.value;

    return (
      <div className="bg-background border p-2 rounded-lg shadow-lg text-sm">
        <p className="font-bold">{label}</p>
        <p>Scheduled: {scheduled?.toFixed(1)}%</p>
        <p>Completed: {actual?.toFixed(1)}%</p>
      </div>
    );
  }

  return null;
};


export default function AnalysisPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState({ events: true, report: false });
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, name: data.name, startDate: data.startDate, endDate: data.endDate };
            });
            setEvents(eventsData);
            if(eventsData.length > 0 && !selectedEventId) {
                setSelectedEventId(eventsData[0].id);
            }
            setLoading(prev => ({...prev, events: false}));
        });
        return () => unsub();
    }, [selectedEventId]);

    useEffect(() => {
        if (!selectedEventId) return;

        const generateAnalysis = async () => {
            setLoading(prev => ({...prev, report: true}));

            try {
                const scheduleQuery = query(collection(db, `events/${selectedEventId}/schedule`), where("status", "==", "scored"));
                const [competitorsSnap, runsSnap, arenasSnap] = await Promise.all([
                    getDocs(collection(db, `events/${selectedEventId}/competitors`)),
                    getDocs(scheduleQuery),
                    getDocs(collection(db, `events/${selectedEventId}/arenas`))
                ]);

                const competitorsMap = new Map(competitorsSnap.docs.map(doc => [doc.id, doc.data()]));
                const arenasMap = new Map(arenasSnap.docs.map(doc => [doc.id, doc.data()]));
                const runs = runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledEvent));

                if (runs.length === 0) {
                    setAnalysisData(null);
                    setLoading(prev => ({...prev, report: false}));
                    return;
                }

                const processedRuns: (RunData & { startVariance: number; actualStartTimeDate: Date })[] = runs.map(run => {
                    let startVariance: number | undefined = undefined;
                    const scheduledDateTime = parse(`${run.date} ${run.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    const actualStartTimeDate = run.actualStartTime?.toDate();
                    if (actualStartTimeDate) {
                        startVariance = differenceInMinutes(actualStartTimeDate, scheduledDateTime);
                    }

                    const actualEndTimeDate = actualStartTimeDate && run.totalTime ? addMinutes(actualStartTimeDate, run.totalTime / 60) : undefined;

                    const competitor = competitorsMap.get(run.competitorId);
                    const arena = arenasMap.get(run.arenaId);

                    return {
                        id: run.id,
                        scheduledTime: `${run.date} ${run.startTime}`,
                        scheduledDateTime,
                        actualStartTime: run.actualStartTime,
                        actualStartTimeDate,
                        actualEndTimeDate,
                        judgeName: run.judgeName,
                        arenaName: arena?.name,
                        arenaId: run.arenaId,
                        competitorName: competitor?.name,
                        startVariance,
                        totalTime: run.totalTime,
                    };
                }).filter((run): run is RunData & { startVariance: number; actualStartTimeDate: Date } =>
                    run.startVariance !== undefined && run.actualStartTimeDate !== undefined
                );


                const initialData: Omit<AnalysisData, 'runs'> = {
                    totalRuns: processedRuns.length,
                    onTimeRuns: 0,
                    avgDelay: 0,
                    totalOverrun: 0,
                    totalTurnaroundTime: 0,
                    turnaroundCount: 0,
                    byArena: {},
                    byJudge: {},
                    pacingData: [],
                };

                const result = processedRuns.reduce((acc, run) => {
                    const delay = run.startVariance;
                    if (delay <= 2) acc.onTimeRuns++;
                    if (delay > 0) acc.totalOverrun += delay;

                    if (run.arenaName) {
                        if (!acc.byArena[run.arenaName]) acc.byArena[run.arenaName] = { totalDelay: 0, count: 0, totalTurnaround: 0, turnaroundCount: 0 };
                        acc.byArena[run.arenaName].totalDelay += delay;
                        acc.byArena[run.arenaName].count++;
                    }
                    if (run.judgeName) {
                        if (!acc.byJudge[run.judgeName]) acc.byJudge[run.judgeName] = { totalDelay: 0, count: 0 };
                        acc.byJudge[run.judgeName].totalDelay += delay;
                        acc.byJudge[run.judgeName].count++;
                    }
                    return acc;
                }, initialData);

                const totalDelaySum = processedRuns.reduce((sum, run) => sum + run.startVariance, 0);
                result.avgDelay = result.totalRuns > 0 ? totalDelaySum / result.totalRuns : 0;

                // Calculate Turnaround Times
                const runsByArena = processedRuns.reduce((acc, run) => {
                    if(!acc[run.arenaId]) acc[run.arenaId] = [];
                    acc[run.arenaId].push(run);
                    return acc;
                }, {} as Record<string, (RunData & { startVariance: number; actualStartTimeDate: Date })[]>);

                for(const arenaId in runsByArena) {
                    const arenaRuns = [...runsByArena[arenaId]].sort((a,b) => a.actualStartTimeDate.getTime() - b.actualStartTimeDate.getTime());
                    for(let i = 1; i < arenaRuns.length; i++) {
                        const prevRun = arenaRuns[i-1];
                        const currentRun = arenaRuns[i];
                        if (prevRun.actualEndTimeDate && currentRun.actualStartTimeDate) {
                            const turnaround = differenceInMinutes(currentRun.actualStartTimeDate, prevRun.actualEndTimeDate);
                            if (turnaround >= 0) {
                                const arenaName = prevRun.arenaName!;
                                result.byArena[arenaName].totalTurnaround += turnaround;
                                result.byArena[arenaName].turnaroundCount++;
                                result.totalTurnaroundTime += turnaround;
                                result.turnaroundCount++;
                            }
                        }
                    }
                }

                // Generate Pacing Data
                const event = events.find(e => e.id === selectedEventId);
                if (event?.startDate) {
                    const eventStart = startOfDay(event.startDate.toDate());
                    const eventEnd = endOfDay(event.endDate?.toDate() || event.startDate.toDate());
                     const timeIntervals = eachMinuteOfInterval({ start: eventStart, end: eventEnd }, { step: 30 });
                     result.pacingData = timeIntervals.map(interval => {
                        const totalRuns = processedRuns.length;
                        if (totalRuns === 0) return { time: format(interval, 'HH:mm'), scheduledPercent: 0, actualPercent: 0 };

                        const scheduledCount = processedRuns.filter(r => r.scheduledDateTime <= interval).length;
                        const actualCount = processedRuns.filter(r => r.actualEndTimeDate && r.actualEndTimeDate <= interval).length;

                        const scheduledPercent = (scheduledCount / totalRuns) * 100;
                        const actualPercent = (actualCount / totalRuns) * 100;

                        return { time: format(interval, 'HH:mm'), scheduledPercent, actualPercent };
                     });
                }
                
                const finalAnalysisData: AnalysisData = {
                    ...result,
                    runs: processedRuns.sort((a,b) => b.startVariance - a.startVariance),
                }

                setAnalysisData(finalAnalysisData);

            } catch (error) {
                console.error("Error generating analysis:", error);
            } finally {
                setLoading(prev => ({...prev, report: false}));
            }
        };

        generateAnalysis();
    }, [selectedEventId, events]);

    const StatCard = ({ title, value, icon: Icon, description }: any) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    const onTimePercentage = analysisData && analysisData.totalRuns > 0 ? (analysisData.onTimeRuns / analysisData.totalRuns) * 100 : 0;
    const avgTurnaround = analysisData && analysisData.turnaroundCount > 0 ? analysisData.totalTurnaroundTime / analysisData.turnaroundCount : 0;

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Logistical Analysis</CardTitle>
                            <CardDescription>
                                Review timing, delays, and performance for event planning.
                            </CardDescription>
                        </div>
                        {loading.events ? <Skeleton className="h-10 w-full sm:w-64" /> : (
                            <Select onValueChange={setSelectedEventId} value={selectedEventId || ''}>
                                <SelectTrigger className="w-full sm:w-64">
                                    <SelectValue placeholder="Select an event..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {events.map(event => (
                                        <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {loading.report ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
                 </div>
            ) : !analysisData || analysisData.runs.length === 0 ? (
                 <Card>
                     <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                            <AlertTriangle className="h-10 w-10" />
                            <div>
                                <p className="font-semibold">No Logistical Data Available</p>
                                <p className="text-sm">No scored runs with timing information found for this event.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="On-Time Start %" value={`${onTimePercentage.toFixed(1)}%`} icon={Clock} description="Started within 2 min of schedule" />
                        <StatCard title="Avg. Start Delay" value={`${analysisData.avgDelay.toFixed(1)} min`} icon={BarChart2} description="Average minutes behind schedule" />
                        <StatCard title="Avg. Arena Turnaround" value={`${avgTurnaround.toFixed(1)} min`} icon={Hourglass} description="Time between runs in an arena"/>
                        <StatCard title="Total Runs Logged" value={analysisData.totalRuns} icon={UserCheck} description="Runs with timing data" />
                    </div>

                     <Card>
                        <CardHeader>
                            <CardTitle>Event Pacing</CardTitle>
                            <CardDescription>Comparison of scheduled vs. actual run completion percentage over time.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analysisData.pacingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />}/>
                                    <Legend verticalAlign="top" height={36} />
                                    <defs>
                                        <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="scheduledPercent" name="Scheduled Progress" stroke="hsl(var(--muted-foreground))" fill="url(#colorScheduled)" />
                                    <Area type="monotone" dataKey="actualPercent" name="Actual Progress" stroke="hsl(var(--primary))" fill="url(#colorActual)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance by Arena</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Arena</TableHead>
                                            <TableHead className="text-right">Avg. Delay (min)</TableHead>
                                            <TableHead className="text-right">Avg. Turnaround (min)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(analysisData.byArena).map(([name, data]) => (
                                            <TableRow key={name}>
                                                <TableCell>{name}</TableCell>
                                                <TableCell className="text-right font-mono">{(data.totalDelay / data.count).toFixed(1)}</TableCell>
                                                <TableCell className="text-right font-mono">{(data.turnaroundCount > 0 ? data.totalTurnaround / data.turnaroundCount : 0).toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance by Judge</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Judge</TableHead>
                                            <TableHead className="text-right">Avg. Delay (min)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(analysisData.byJudge).map(([name, data]) => (
                                            <TableRow key={name}>
                                                <TableCell>{name}</TableCell>
                                                <TableCell className="text-right font-mono">{(data.totalDelay / data.count).toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                     <Card>
                        <CardHeader>
                            <CardTitle>Detailed Run Log</CardTitle>
                            <CardDescription>All scored runs with timing data, sorted by the largest delay.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Competitor</TableHead>
                                        <TableHead>Arena</TableHead>
                                        <TableHead>Judge</TableHead>
                                        <TableHead>Scheduled Start</TableHead>
                                        <TableHead>Actual Start</TableHead>
                                        <TableHead className="text-right">Variance (min)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                 <TableBody>
                                    {analysisData.runs.map((run) => (
                                        <TableRow key={run.id}>
                                            <TableCell>{run.competitorName}</TableCell>
                                            <TableCell>{run.arenaName}</TableCell>
                                            <TableCell>{run.judgeName}</TableCell>
                                            <TableCell>{run.scheduledTime}</TableCell>
                                            <TableCell>{run.actualStartTimeDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                            <TableCell className={`text-right font-mono ${run.startVariance > 2 ? 'text-destructive' : 'text-green-600'}`}>{run.startVariance.toFixed(0)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
