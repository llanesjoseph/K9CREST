import Link from "next/link";
import { PlusCircle } from "lucide-react";
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

const events = [
    { name: "2024 Spring National", date: "2024-05-10", location: "Springfield, IL", status: "Completed" },
    { name: "Summer Regional Championship", date: "2024-08-15", location: "Miami, FL", status: "Upcoming" },
    { name: "West Coast Invitational", date: "2024-09-20", location: "San Diego, CA", status: "Upcoming" },
    { name: "Iron Dog Competition", date: "2024-10-05", location: "Denver, CO", status: "Planning" },
    { name: "K9 Heroes Charity Trial", date: "2024-11-12", location: "Washington, D.C.", status: "Planning" },
];

export default function EventsPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Manage and view all K9 trial events.
          </CardDescription>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.name}>
                <TableCell className="font-medium">
                  <Link href="/dashboard/events/1/schedule" className="hover:underline">
                    {event.name}
                  </Link>
                </TableCell>
                <TableCell>{event.date}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  <Badge variant={event.status === 'Completed' ? 'outline' : 'default'}>{event.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                   <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/events/1/schedule">View</Link>
                   </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
