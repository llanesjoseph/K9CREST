
"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIScheduler } from "@/components/ai-scheduler";
import { CompetitorImportDialog } from "@/components/competitor-import-dialog";
import { useEffect, useState } from "react";
import { collection, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";


const schedule = {
  arena1: [],
  arena2: [],
};


const judges: any[] = [];

interface Competitor {
    id: string;
    name: string;
    dogName: string;
    agency: string;
}

function ScheduleTable({ runs, competitors, judges }: { runs: any[], competitors: Competitor[], judges: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Time</TableHead>
          <TableHead>Competitor</TableHead>
          <TableHead>Judge</TableHead>
          <TableHead>Timer</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              No runs scheduled for this arena.
            </TableCell>
          </TableRow>
        ) : (
          runs.map((run) => (
            <TableRow key={run.time}>
              <TableCell className="font-medium">{run.time}</TableCell>
              <TableCell>
                {run.competitor ? `${run.competitor} & ${run.dog}` : 
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Assign Competitor" /></SelectTrigger>
                    <SelectContent>
                      {competitors.map(c => <SelectItem key={c.id} value={c.id}>{c.name} & {c.dogName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              </TableCell>
              <TableCell>
                {run.judge ? run.judge : 
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Assign Judge" /></SelectTrigger>
                    <SelectContent>
                      {judges.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              </TableCell>
              <TableCell>{run.timer || "Auto-assigned"}</TableCell>
              <TableCell>
                <Badge variant={run.status === 'Open' ? "secondary" : "default"}>{run.status}</Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default function SchedulePage() {
    const params = useParams();
    const eventId = params.id as string;
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!eventId) return;

        const competitorsRef = collection(db, "events", eventId, "competitors");
        const unsubscribe = onSnapshot(competitorsRef, (snapshot: QuerySnapshot<DocumentData>) => {
            const competitorsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    dogName: data.dogName,
                    agency: data.agency,
                };
            });
            setCompetitors(competitorsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/events"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Event Schedule</h1>
      </div>
      <div className="flex justify-between items-center">
        <div>
            {/* Can add filters or other controls here */}
        </div>
        <div className="flex gap-2">
            <CompetitorImportDialog eventId={eventId} />
            <Button variant="outline" asChild><Link href={`/dashboard/events/${eventId}/rubric`}>Configure Rubric</Link></Button>
            <Button variant="outline" asChild><Link href={`/dashboard/events/${eventId}/leaderboard`}>View Leaderboard</Link></Button>
            <AIScheduler />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Editor</CardTitle>
          <CardDescription>
            Use the AI Scheduler to generate a schedule, or add runs manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="arena1">
            <TabsList>
              <TabsTrigger value="arena1">Arena 1</TabsTrigger>
              <TabsTrigger value="arena2">Arena 2</TabsTrigger>
            </TabsList>
            <TabsContent value="arena1">
                <ScheduleTable runs={schedule.arena1} competitors={competitors} judges={judges} />
            </TabsContent>
            <TabsContent value="arena2">
                <ScheduleTable runs={schedule.arena2} competitors={competitors} judges={judges} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competitors ({competitors.length})</CardTitle>
          <CardDescription>
            List of all competitors registered for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Competitor Name</TableHead>
                        <TableHead>K9 Name</TableHead>
                        <TableHead>Agency</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">Loading competitors...</TableCell>
                        </TableRow>
                    ) : competitors.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">No competitors imported yet.</TableCell>
                        </TableRow>
                    ) : (
                        competitors.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{c.dogName}</TableCell>
                                <TableCell>{c.agency}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
