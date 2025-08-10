
"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { collection, onSnapshot, getDocs, query, where, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, List, BarChart2, Timer, Shield } from "lucide-react";


interface Event {
    id: string;
    name: string;
}

interface ScoreData {
    totalPoints: number;
    totalRuns: number;
    highestScore: number;
    phases: Record<string, { totalScore: number, count: number }>;
    exercises: Record<string, { type: string, scores: number[], maxPoints?: number }>;
    agencies: Record<string, { totalScore: number, count: number }>;
}


export default function ReportsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState({ events: true, report: false });
    const [reportData, setReportData] = useState<any>(null);

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

        const generateReport = async () => {
            setLoading(prev => ({...prev, report: true}));
            
            try {
                // Fetch all necessary data in parallel
                const scheduleQuery = query(collection(db, `events/${selectedEventId}/schedule`), where("status", "==", "scored"));
                const [competitorsSnap, runsSnap] = await Promise.all([
                    getDocs(collection(db, `events/${selectedEventId}/competitors`)),
                    getDocs(scheduleQuery)
                ]);

                const competitors = competitorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const runs = runsSnap.docs.map(doc => doc.data());
                
                if (runs.length === 0) {
                    setReportData(null); // No data to report
                    return;
                }
                
                const competitorMap = new Map(competitors.map(c => [c.id, c]));
                const scoresByCompetitor: Record<string, number> = {};
                
                const initialData: ScoreData = {
                    totalPoints: 0,
                    totalRuns: runs.length,
                    highestScore: 0,
                    phases: {},
                    exercises: {},
                    agencies: {},
                };

                const processedData = runs.reduce((acc, run) => {
                    const competitor = competitorMap.get(run.competitorId);
                    if (!competitor) return acc;

                    let runScore = 0;
                    if (run.scores) {
                        run.scores.forEach((phase: any) => {
                            if (!acc.phases[phase.phaseName]) acc.phases[phase.phaseName] = { totalScore: 0, count: 0 };
                            
                            let phaseScore = 0;
                            phase.exercises.forEach((ex: any) => {
                                const key = `${phase.phaseName} / ${ex.exerciseName}`;
                                if (!acc.exercises[key]) acc.exercises[key] = { type: ex.type, scores: [], maxPoints: ex.maxPoints };
                                
                                let exerciseScore = 0;
                                if (ex.type === 'points' || ex.type === 'time') {
                                    exerciseScore = Number(ex.score) || 0;
                                } else if (ex.type === 'pass/fail') {
                                    exerciseScore = (ex.score === 1 || ex.score === true) ? (ex.maxPoints || 1) : 0;
                                }
                                acc.exercises[key].scores.push(exerciseScore);
                                acc.exercises[key].maxPoints = ex.maxPoints;
                                phaseScore += exerciseScore;
                            });

                            acc.phases[phase.phaseName].totalScore += phaseScore;
                            acc.phases[phase.phaseName].count++;
                            runScore += phaseScore;
                        });
                    }
                    
                    acc.totalPoints += runScore;
                     if (!scoresByCompetitor[competitor.id]) {
                        scoresByCompetitor[competitor.id] = 0;
                    }
                    scoresByCompetitor[competitor.id] += runScore;
                    
                    if (!acc.agencies[competitor.agency]) acc.agencies[competitor.agency] = { totalScore: 0, count: 0 };
                    acc.agencies[competitor.agency].totalScore += runScore;
                    acc.agencies[competitor.agency].count++;

                    return acc;
                }, initialData);
                
                const competitorStandings = Object.entries(scoresByCompetitor)
                    .map(([id, score]) => ({...competitorMap.get(id), score}))
                    .sort((a,b) => b.score - a.score);
                
                const agencyStandings = Object.entries(processedData.agencies)
                    .map(([name, data]) => ({ name, score: data.totalScore / data.count }))
                    .sort((a,b) => b.score - a.score);

                setReportData({
                    ...processedData,
                    totalCompetitors: competitors.length,
                    averageScore: processedData.totalPoints / processedData.totalRuns,
                    highestScore: competitorStandings.length > 0 ? competitorStandings[0].score : 0,
                    phaseAverages: Object.entries(processedData.phases).map(([name, data]) => ({
                        name,
                        average: data.totalScore / data.count,
                    })).sort((a,b) => b.average - a.average),
                    exerciseMetrics: Object.entries(processedData.exercises).map(([name, data]) => {
                        const total = data.scores.reduce((sum, s) => sum + s, 0);
                        const avg = total / data.scores.length;
                        return {
                            name,
                            type: data.type,
                            average: avg,
                            passRate: data.type === 'pass/fail' ? (total / (data.maxPoints || 1)) / data.scores.length * 100 : null,
                            min: Math.min(...data.scores),
                            max: Math.max(...data.scores),
                        };
                    }),
                    topCompetitors: competitorStandings.slice(0,3),
                    topAgencies: agencyStandings.slice(0,3)
                });
            } catch (error) {
                console.error("Error generating report:", error);
            } finally {
                setLoading(prev => ({...prev, report: false}));
            }
        };

        generateReport();
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
    )

  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Event Reports</CardTitle>
                        <CardDescription>
                        Select an event to view detailed performance analytics.
                        </CardDescription>
                    </div>
                    {loading.events ? <Skeleton className="h-10 w-full sm:w-64" /> : (
                         <Select onValueChange={setSelectedEventId} value={selectedEventId || ''}>
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue placeholder="Select an event..." />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map(event => (
                                <SelectItem key={event.id} value={event.id}>
                                    {event.name}
                                </SelectItem>
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
        ) : !reportData ? (
             <Card>
                 <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-12">
                        <p>No scored runs found for the selected event.</p>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <>
                {/* Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Competitors" value={reportData.totalCompetitors} icon={Users} />
                    <StatCard title="Total Runs Scored" value={reportData.totalRuns} icon={List} />
                    <StatCard title="Overall Average Score" value={reportData.averageScore.toFixed(2)} icon={BarChart2} description="Across all scored runs"/>
                    <StatCard title="Highest Score" value={reportData.highestScore.toFixed(2)} icon={Trophy} description="Top individual score" />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle>Performance by Phase</CardTitle>
                            <CardDescription>Average score for each phase of the competition.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                             <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={reportData.phaseAverages}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                    <Legend />
                                    <Bar dataKey="average" fill="hsl(var(--primary))" name="Average Score" radius={[4, 4, 0, 0]} />
                                </BarChart>
                             </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Top Performers</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Trophy className="h-4 w-4"/> Top 3 Competitors</h3>
                           <Table>
                               <TableBody>
                                   {reportData.topCompetitors.map((c: any, i:number) => (
                                       <TableRow key={c.id}>
                                           <TableCell className="font-medium">#{i+1}</TableCell>
                                           <TableCell>{c.dogName} ({c.name})</TableCell>
                                           <TableCell className="text-right font-mono">{c.score.toFixed(2)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                            <h3 className="text-sm font-semibold text-muted-foreground mt-6 mb-2 flex items-center gap-2"><Shield className="h-4 w-4"/> Top 3 Agencies</h3>
                           <Table>
                               <TableBody>
                                   {reportData.topAgencies.map((a: any, i:number) => (
                                       <TableRow key={a.name}>
                                           <TableCell className="font-medium">#{i+1}</TableCell>
                                           <TableCell>{a.name}</TableCell>
                                           <TableCell className="text-right font-mono">{a.score.toFixed(2)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Exercise Breakdown</CardTitle>
                        <CardDescription>Detailed metrics for each scoring exercise across all runs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Exercise</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Pass Rate</TableHead>
                                    <TableHead className="text-right">Avg Score / Time</TableHead>
                                    <TableHead className="text-right">Best</TableHead>
                                    <TableHead className="text-right">Worst</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {reportData.exerciseMetrics.map((ex: any) => (
                                    <TableRow key={ex.name}>
                                        <TableCell className="font-medium">{ex.name}</TableCell>
                                        <TableCell><Badge variant="outline">{ex.type}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{ex.passRate ? `${ex.passRate.toFixed(1)}%` : 'N/A'}</TableCell>
                                        <TableCell className="text-right font-mono">{ex.average.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-mono ${ex.type === 'time' ? 'text-green-600' : 'text-blue-600'}`}>{ex.min.toFixed(2)}</TableCell>
                                        <TableCell className={`text-right font-mono ${ex.type === 'time' ? 'text-red-600' : 'text-gray-500'}`}>{ex.max.toFixed(2)}</TableCell>
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
