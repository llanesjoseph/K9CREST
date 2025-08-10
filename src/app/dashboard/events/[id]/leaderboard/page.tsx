
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

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
}

interface AgencyStanding {
  rank: number;
  agency: string;
  score: number;
}

interface CompetitorData {
    id: string;
    [key: string]: any;
}

export default function LeaderboardPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [overallStandings, setOverallStandings] = useState<Standing[]>([]);
  const [agencyStandings, setAgencyStandings] = useState<AgencyStanding[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [runs, setRuns] = useState<DocumentData[]>([]);

  useEffect(() => {
    if (!eventId) return;

    setLoading(true);

    const competitorsQuery = collection(db, `events/${eventId}/competitors`);
    const scheduleQuery = query(
      collection(db, `events/${eventId}/schedule`),
      where("status", "==", "scored")
    );

    const competitorsUnsub = onSnapshot(competitorsQuery, (snapshot) => {
        setCompetitors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
        console.error("Error fetching competitors:", error);
    });

    const scheduleUnsub = onSnapshot(scheduleQuery, (snapshot) => {
        setRuns(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
        console.error("Error fetching schedule:", error);
    });
    
    // Give a moment for initial data to load
    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
        competitorsUnsub();
        scheduleUnsub();
        clearTimeout(timer);
    };
  }, [eventId]);

  useEffect(() => {
    if (!competitors.length && !runs.length && loading) {
        return; // Wait for initial data
    }

    const competitorMap = new Map(competitors.map(c => [c.id, c]));
    const competitorScores: Record<string, { totalScore: number; data: any }> = {};

    runs.forEach(run => {
      const competitor = competitorMap.get(run.competitorId);
      if (!competitor) return;

      let runScore = 0;
      if (run.scores) {
        run.scores.forEach((phase: Score) => {
          phase.exercises.forEach(exercise => {
            if (exercise.type === 'points') {
              runScore += Number(exercise.score) || 0;
            } else if (exercise.type === 'time') {
              // Lower time is better, but for simplicity we'll add it.
              // A real system would need a better scoring algorithm for time.
              runScore += Number(exercise.score) || 0;
            } else if (exercise.type === 'pass/fail') {
              const passed = exercise.score === 1 || exercise.score === true;
              // Assuming pass gives some points, e.g. 1, or a configured value
              runScore += passed ? (exercise.maxPoints || 1) : 0;
            }
          });
        });
      }

      if (!competitorScores[run.competitorId]) {
        competitorScores[run.competitorId] = { totalScore: 0, data: competitor };
      }
      competitorScores[run.competitorId].totalScore += runScore;
    });

    const calculatedStandings = Object.values(competitorScores)
      .map(item => ({
        competitorId: item.data.id,
        competitor: item.data.name,
        dog: item.data.dogName,
        agency: item.data.agency,
        score: item.totalScore
      }))
      .sort((a, b) => b.score - a.score)
      .map((s, index) => ({ ...s, rank: index + 1 }));

    setOverallStandings(calculatedStandings);

    // Calculate Agency Standings
    const agencyScores: Record<string, number> = {};
    calculatedStandings.forEach(standing => {
      if (!agencyScores[standing.agency]) {
        agencyScores[standing.agency] = 0;
      }
      agencyScores[standing.agency] += standing.score;
    });

    const calculatedAgencyStandings = Object.entries(agencyScores)
      .map(([agency, score]) => ({ agency, score }))
      .sort((a, b) => b.score - a.score)
      .map((s, index) => ({ ...s, rank: index + 1 }));

    setAgencyStandings(calculatedAgencyStandings);

  }, [runs, competitors]);

  const renderOverallBody = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-overall-${i}`}>
          <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
          <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
          <TableCell><Skeleton className="h-6 w-1/4" /></TableCell>
        </TableRow>
      ));
    }
    if (overallStandings.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No scores submitted yet.
          </TableCell>
        </TableRow>
      );
    }
    return overallStandings.map((entry) => (
      <TableRow key={entry.competitorId}>
        <TableCell className="font-bold text-lg">
          <div className="flex items-center justify-center w-8">
            {entry.rank <= 3 ? <Trophy className={`w-6 h-6 ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-yellow-700'}`} /> : entry.rank}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={`https://placehold.co/40x40?text=${entry.competitor.charAt(0)}`} data-ai-hint="person portrait" />
              <AvatarFallback>{entry.competitor.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{entry.competitor}</div>
              <div className="text-sm text-muted-foreground">{entry.dog}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>{entry.agency}</TableCell>
        <TableCell className="text-right font-mono text-lg">{entry.score.toFixed(1)}</TableCell>
      </TableRow>
    ));
  }

  const renderAgencyBody = () => {
     if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-agency-${i}`}>
          <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
          <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
        </TableRow>
      ));
    }
    if (agencyStandings.length === 0) {
       return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center">
            No agency scores available.
          </TableCell>
        </TableRow>
      );
    }
    return agencyStandings.map((entry) => (
      <TableRow key={entry.agency}>
        <TableCell className="font-bold text-lg">
          <div className="flex items-center justify-center w-8">
            {entry.rank <= 3 ? <Trophy className={`w-6 h-6 ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-yellow-700'}`} /> : entry.rank}
          </div>
        </TableCell>
        <TableCell className="font-medium">{entry.agency}</TableCell>
        <TableCell className="text-right font-mono text-lg">{entry.score.toFixed(1)}</TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}/schedule`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Live Leaderboard</h1>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Standings</CardTitle>
                <CardDescription>
                Real-time results for the event.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overall">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overall">Overall Standings</TabsTrigger>
                        <TabsTrigger value="agency">Agency Standings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overall">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Rank</TableHead>
                                <TableHead>Competitor</TableHead>
                                <TableHead>Agency</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {renderOverallBody()}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="agency">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Rank</TableHead>
                                <TableHead>Agency</TableHead>
                                <TableHead className="text-right">Total Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderAgencyBody()}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
