
"use client";

import { useState, useEffect, useMemo } from "react";

// Removed generateStaticParams - not compatible with client components
import Link from "next/link";
import { ChevronLeft, Trophy, Timer, Medal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { collection, query, where, onSnapshot, DocumentData, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduledEvent, Competitor } from "@/lib/schedule-types";

interface Score {
  phaseName: string;
  exercises: {
    exerciseName: string;
    score: number | boolean;
    type: string;
    maxPoints?: number;
  }[];
}

interface Standing {
  rank: number;
  competitorId: string;
  competitor: string;
  dog: string;
  agency: string;
  score: number;
  time: number;
}

interface AgencyStanding {
  rank: number;
  agency: string;
  score: number;
}

interface EventData {
    id: string;
    name: string;
    standings: Standing[];
}

export default function LeaderboardPage() {
  const params = useParams();
  const eventId = params.id as string; // We'll keep this to provide a link back to the specific event schedule
  const [loading, setLoading] = useState(true);
  const [eventsData, setEventsData] = useState<EventData[]>([]);
  const [agencyStandings, setAgencyStandings] = useState<AgencyStanding[]>([]);

  useEffect(() => {
    const fetchAllEventData = async () => {
        setLoading(true);
        try {
            const eventsQuery = query(collection(db, "events"));
            const eventsSnap = await getDocs(eventsQuery);
            
            const allEventsData = await Promise.all(
                eventsSnap.docs.map(async (eventDoc) => {
                    const currentEventId = eventDoc.id;
                    const competitorsQuery = collection(db, `events/${currentEventId}/competitors`);
                    const scheduleQuery = query(
                        collection(db, `events/${currentEventId}/schedule`),
                        where("status", "==", "scored")
                    );

                    const [competitorsSnap, scheduleSnap] = await Promise.all([
                        getDocs(competitorsQuery),
                        getDocs(scheduleQuery)
                    ]);
                    
                    const competitors = competitorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
                    const runs = scheduleSnap.docs.map(doc => doc.data() as ScheduledEvent);

                    const competitorMap = new Map(competitors.map(c => [c.id, c]));
                    const competitorStats: Record<string, { totalScore: number; totalTime: number; data: any }> = {};

                    runs.forEach(run => {
                        const competitor = competitorMap.get(run.competitorId);
                        if (!competitor) return;

                        let runScore = 0;
                        if (run.scores) {
                            run.scores.forEach((phase: Score) => {
                                phase.exercises.forEach(exercise => {
                                    if (exercise.type === 'points') {
                                        runScore += Number(exercise.score) || 0;
                                    } else if (exercise.type === 'pass/fail') {
                                        const passed = Number(exercise.score) > 0;
                                        runScore += passed ? (Number(exercise.maxPoints) || 0) : 0;
                                    }
                                });
                            });
                        }
                        const runTime = Number(run.totalTime) || 0;

                        if (!competitorStats[run.competitorId]) {
                            competitorStats[run.competitorId] = { totalScore: 0, totalTime: 0, data: competitor };
                        }
                        competitorStats[run.competitorId].totalScore += runScore;
                        competitorStats[run.competitorId].totalTime += runTime;
                    });
                    
                     const standings = Object.values(competitorStats)
                        .map(item => ({
                            competitorId: item.data.id,
                            competitor: item.data.name,
                            dog: item.data.dogName,
                            agency: item.data.agency,
                            score: item.totalScore,
                            time: item.totalTime,
                        }))
                        .sort((a, b) => b.score - a.score || a.time - b.time)
                        .map((s, index) => ({ ...s, rank: index + 1 }));

                    return {
                        id: currentEventId,
                        name: eventDoc.data().name,
                        standings: standings,
                    };
                })
            );
            
            // Calculate overall agency standings
            const agencyScores: Record<string, { totalScore: number, count: number }> = {};
            allEventsData.forEach(event => {
                event.standings.forEach(standing => {
                    if(!agencyScores[standing.agency]) {
                        agencyScores[standing.agency] = { totalScore: 0, count: 0 };
                    }
                    agencyScores[standing.agency].totalScore += standing.score;
                    agencyScores[standing.agency].count += 1; // Or some other logic
                });
            });

            const calculatedAgencyStandings = Object.entries(agencyScores)
              .map(([agency, data]) => ({ agency, score: data.totalScore }))
              .sort((a, b) => b.score - a.score)
              .map((s, index) => ({ ...s, rank: index + 1 }));

            setEventsData(allEventsData.filter(e => e.standings.length > 0));
            setAgencyStandings(calculatedAgencyStandings);

        } catch (error) {
            console.error("Error fetching event leaderboards: ", error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchAllEventData();
  }, []);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return '00:00.0';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds * 10) % 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
  };

  const renderStandingsTable = (standings: Standing[]) => {
      if (standings.length === 0) {
          return <p className="text-center text-muted-foreground py-4">No scored runs for this event yet.</p>;
      }
      return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {standings.slice(0, 5).map(entry => (
                    <TableRow key={entry.competitorId}>
                        <TableCell className="font-bold text-lg text-center">
                            {entry.rank <= 3 ? <Medal className={`w-6 h-6 mx-auto ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-yellow-700'}`} /> : entry.rank}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{entry.competitor}</div>
                            <div className="text-sm text-muted-foreground">{entry.dog} ({entry.agency})</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-base">{entry.score.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatTime(entry.time)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      );
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}/schedule`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Leaderboards</h1>
      </div>
      
       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-6">
                {loading ? (
                    Array.from({length: 2}).map((_, i) => (
                         <Card key={`skel-event-${i}`}>
                            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                        </Card>
                    ))
                ) : eventsData.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>No Active Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-muted-foreground py-12">There are no events with scored runs to display.</p>
                        </CardContent>
                    </Card>
                ) : (
                    eventsData.map(event => (
                        <Card key={event.id}>
                            <CardHeader>
                                <CardTitle>{event.name}</CardTitle>
                                <CardDescription>Top 5 Overall Standings</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0">
                                {renderStandingsTable(event.standings)}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
            <div className="xl:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Top Agencies</CardTitle>
                        <CardDescription>Aggregate scores across all events.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-48 w-full" /> : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">Rank</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead className="text-right">Total Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agencyStandings.slice(0, 5).map(entry => (
                                        <TableRow key={entry.agency}>
                                            <TableCell className="font-bold text-lg text-center">
                                                {entry.rank <= 3 ? <Trophy className={`w-6 h-6 mx-auto ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-yellow-700'}`} /> : entry.rank}
                                            </TableCell>
                                            <TableCell className="font-medium">{entry.agency}</TableCell>
                                            <TableCell className="text-right font-mono text-base">{entry.score.toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
       </div>
    </div>
  );
}

    