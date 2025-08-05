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

const schedule = {
  arena1: [],
  arena2: [],
};

const competitors: any[] = [];
const judges: any[] = [];

function ScheduleTable({ runs }: { runs: any[] }) {
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
                      {competitors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/events"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Event Schedule</h1>
      </div>
      <div className="flex justify-end gap-2">
         <Button variant="outline" asChild><Link href="/dashboard/events/1/rubric">Configure Rubric</Link></Button>
         <Button variant="outline" asChild><Link href="/dashboard/events/1/leaderboard">View Leaderboard</Link></Button>
         <AIScheduler />
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
                <ScheduleTable runs={schedule.arena1} />
            </TabsContent>
            <TabsContent value="arena2">
                <ScheduleTable runs={schedule.arena2} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
