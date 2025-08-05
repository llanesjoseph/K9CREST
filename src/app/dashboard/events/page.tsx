
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Trash2 } from "lucide-react";
import { collection, onSnapshot, QuerySnapshot, DocumentData, deleteDoc, doc } from "firebase/firestore";
import { format } from "date-fns";

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
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Event {
    id: string;
    name: string;
    startDate: any;
    endDate?: any;
    location: string;
    status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot: QuerySnapshot<DocumentData>) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          location: data.location,
          status: data.status,
        };
      });
      setEvents(eventsData);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const formatDateRange = (start: Date, end?: Date) => {
    if (!start) return "Date not set";
    const startDate = format(start, "LLL dd, yyyy");
    if (end) {
      const endDate = format(end, "LLL dd, yyyy");
      return `${startDate} - ${endDate}`;
    }
    return startDate;
  }

  const handleDelete = async (eventId: string, eventName: string) => {
    try {
      await deleteDoc(doc(db, "events", eventId));
      toast({
        title: "Event Deleted",
        description: `The event "${eventName}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting the event. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Manage and view all K9 trial events.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/dashboard/events/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
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
            {loading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Skeleton className="h-4 w-1/2 mx-auto" />
                    </TableCell>
                </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No events found. {isAdmin && <Link href="/dashboard/events/create" className="text-primary underline">Create one</Link>}
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/events/${event.id}/schedule`} className="hover:underline">
                      {event.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateRange(event.startDate, event.endDate)}</TableCell>
                  <TableCell>{event.location}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === 'Completed' ? 'outline' : 'default'}>{event.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/events/${event.id}/schedule`}>View</Link>
                    </Button>
                    {isAdmin && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the event
                                    <span className="font-bold"> {event.name} </span>
                                    and all of its associated data, including schedules, rubrics, and scores.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(event.id, event.name)}>
                                    Continue
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
