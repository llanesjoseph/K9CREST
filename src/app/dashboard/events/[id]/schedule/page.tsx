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
  arena1: [
    { time: "09:00 AM", competitor: "John Doe", dog: "Rex", judge: "Judge Smith", timer: "Timer 1", status: "Upcoming" },
    { time: "09:15 AM", competitor: "Jane Smith", dog: "Bella", judge: "Judge Smith", timer: "Timer 1", status: "Upcoming" },
    { time: "09:30 AM", competitor: "", dog: "", judge: "", timer: "", status: "Open" },
    { time: "09:45 AM", competitor: "Peter Jones", dog: "Max", judge: "Judge Miller", timer: "Timer 2", status: "Upcoming" },
    { time: "10:00 AM", competitor: "", dog: "", judge: "", timer: "", status: "Open" },
  ],
  arena2: [
    { time: "09:00 AM", competitor: "Mary Johnson", dog: "Lucy", judge: "Judge Davis", timer: "Timer 3", status: "Upcoming" },
    { time: "09:20 AM", competitor: "David Wilson", dog: "Charlie", judge: "Judge Davis", timer: "Timer 3", status: "Upcoming" },
    { time: "09:40 AM", competitor: "", dog: "", judge: "", timer: "", status: "Open" },
    { time: "10:00 AM", competitor: "", dog: "", judge: "", timer: "", status: "Open" },
  ],
};

const competitors = ["John Doe", "Jane Smith", "Peter Jones", "Mary Johnson", "David Wilson"];
const judges = ["Judge Smith", "Judge Miller", "Judge Davis"];

function ScheduleTable({ runs }: { runs: typeof schedule.arena1 }) {
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
        {runs.map((run) => (
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
        ))}
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
        <h1 className="text-2xl font-semibold">Summer Regional Championship Schedule</h1>
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
            Drag-and-drop to schedule competitors. Click to assign judges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="arena1">
            <TabsList>
              <TabsTrigger value="arena1">Arena 1 (Obedience)</TabsTrigger>
              <TabsTrigger value="arena2">Arena 2 (Protection)</TabsTrigger>
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
