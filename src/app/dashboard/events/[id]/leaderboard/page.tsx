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

const overallStandings = [
    { rank: 1, competitor: "John Doe", dog: "Rex", agency: "Springfield PD", score: 295.5 },
    { rank: 2, competitor: "Jane Smith", dog: "Bella", agency: "Metro K9 Unit", score: 292.0 },
    { rank: 3, competitor: "Peter Jones", dog: "Max", agency: "County Sheriff", score: 289.8 },
    { rank: 4, competitor: "Mary Johnson", dog: "Lucy", agency: "Springfield PD", score: 285.2 },
    { rank: 5, competitor: "David Wilson", dog: "Charlie", agency: "State Police", score: 281.0 },
];

const agencyStandings = [
    { rank: 1, agency: "Springfield PD", score: 580.7 },
    { rank: 2, agency: "Metro K9 Unit", score: 560.5 },
    { rank: 3, agency: "County Sheriff", score: 555.9 },
    { rank: 4, agency: "State Police", score: 540.1 },
];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/events/1/schedule"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Live Leaderboard</h1>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Standings</CardTitle>
                <CardDescription>
                Real-time results for the Summer Regional Championship.
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
                                <TableHead className="w-[50px]">Rank</TableHead>
                                <TableHead>Competitor</TableHead>
                                <TableHead>Agency</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {overallStandings.map((entry) => (
                                <TableRow key={entry.rank}>
                                    <TableCell className="font-bold text-lg">
                                        <div className="flex items-center justify-center">
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
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="agency">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[50px]">Rank</TableHead>
                                <TableHead>Agency</TableHead>
                                <TableHead className="text-right">Total Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agencyStandings.map((entry) => (
                                <TableRow key={entry.rank}>
                                     <TableCell className="font-bold text-lg">
                                        <div className="flex items-center justify-center">
                                            {entry.rank <= 3 ? <Trophy className={`w-6 h-6 ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-yellow-700'}`} /> : entry.rank}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{entry.agency}</TableCell>
                                    <TableCell className="text-right font-mono text-lg">{entry.score.toFixed(1)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
