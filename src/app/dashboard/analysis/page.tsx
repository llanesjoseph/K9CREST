
"use client";

import { useState, useEffect } from "react";
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
import { collection, onSnapshot, getDocs, query, where, DocumentData, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Server, UserCheck, BarChart2 } from "lucide-react";
import { differenceInMinutes, parse } from "date-fns";

interface Event {
    id: string;
    name: string;
}

interface RunData {
    id: string;
    scheduledTime: string;
    actualStartTime?: Timestamp;
    judgeName?: string;
    arenaName?: string;
    competitorName?: string;
    startVariance?: number;
}

interface AnalysisData {
    totalRuns: number;
    onTimeRuns: number;
    avgDelay: number;
    totalOverrun: number;
    byArena: Record<string, { totalDelay: number, count: number }>;
    byJudge: Record<string, { totalDelay: number, count: number }>;
    runs: RunData[];
}

export default function AnalysisPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState({ events: true, report: false });
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
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
                const runs = runsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (runs.length === 0) {
                    setAnalysisData(null);
                    return;
                }

                const processedRuns: RunData[] = runs.map(run => {
                    let startVariance: number | undefined = undefined;
                    if (run.actualStartTime && run.startTime && run.date) {
                        const scheduledDateTime = parse(`${run.date} ${run.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                        startVariance = differenceInMinutes(run.actualStartTime.toDate(), scheduledDateTime);
                    }
                    const competitor = competitorsMap.get(run.competitorId);
                    const arena = arenasMap.get(run.arenaId);

                    return {
                        id: run.id,
                        scheduledTime: `${run.date} ${run.startTime}`,
                        actualStartTime: run.actualStartTime,
                        judgeName: run.judgeName,
                        arenaName: arena?.name,
                        competitorName: competitor?.name,
                        startVariance,
                    };
                }).filter(run => run.startVariance !== undefined);

                const initialData: AnalysisData = {
                    totalRuns: processedRuns.length,
                    onTimeRuns: 0,
                    avgDelay: 0,
                    totalOverrun: 0,
                    byArena: {},
                    byJudge: {},
                    runs: processedRuns.sort((a,b) => b.startVariance! - a.startVariance!),
                };

                const result = processedRuns.reduce((acc, run) => {
                    const delay = run.startVariance!;
                    if (delay <= 2) acc.onTimeRuns++;
                    if (delay > 0) acc.totalOverrun += delay;
                    
                    if (run.arenaName) {
                        if (!acc.byArena[run.arenaName]) acc.byArena[run.arenaName] = { totalDelay: 0, count: 0 };
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

                const totalDelaySum = processedRuns.reduce((sum, run) => sum + run.startVariance!, 0);
                result.avgDelay = result.totalRuns > 0 ? totalDelaySum / result.totalRuns : 0;

                setAnalysisData(result);

            } catch (error) {
                console.error("Error generating analysis:", error);
            } finally {
                setLoading(prev => ({...prev, report: false}));
            }
        };

        generateAnalysis();
    }, [selectedEventId]);

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
            ) : !analysisData ? (
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
                        <StatCard title="Total Event Overrun" value={`${analysisData.totalOverrun.toFixed(0)} min`} icon={Clock} description="Sum of all positive delays" />
                        <StatCard title="Total Runs Logged" value={analysisData.totalRuns} icon={UserCheck} description="Runs with timing data" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Delay by Arena</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Arena</TableHead>
                                            <TableHead className="text-right">Avg. Delay (min)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(analysisData.byArena).map(([name, data]) => (
                                            <TableRow key={name}>
                                                <TableCell>{name}</TableCell>
                                                <TableCell className="text-right font-mono">{(data.totalDelay / data.count).toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Delay by Judge</CardTitle>
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
                                            <TableCell>{run.actualStartTime?.toDate().toLocaleTimeString()}</TableCell>
                                            <TableCell className={`text-right font-mono ${run.startVariance! > 2 ? 'text-destructive' : 'text-green-600'}`}>{run.startVariance!.toFixed(0)}</TableCell>
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

    