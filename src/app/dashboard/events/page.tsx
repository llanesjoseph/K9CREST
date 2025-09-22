
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Trash2, MoreVertical, Eye, Calendar, MapPin, Users, Clock, Trophy } from "lucide-react";
import { collection, onSnapshot, QuerySnapshot, DocumentData, query, orderBy, limit } from "firebase/firestore";
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
import { auth, db } from "@/lib/firebase";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { LoadingScreen } from "@/components/ui/loading";


interface Event {
    id: string;
    name: string;
    startDate: any;
    endDate?: any;
    location: string;
    status: 'Draft' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
    participantCount?: number;
    maxParticipants?: number;
    description?: string;
    eventType?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("startDate", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          location: data.location,
          status: data.status || 'Draft',
          participantCount: data.participantCount || 0,
          maxParticipants: data.maxParticipants || 50,
          description: data.description || '',
          eventType: data.eventType || 'Trial',
        };
      });
      setEvents(eventsData);
      setLoading(false);
    });

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
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    try {
      const token = await (await auth.currentUser?.getIdToken())!;
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Event Deleted", description: `The event "${eventName}" has been successfully deleted.` });
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast({ variant: "destructive", title: "Error", description: "There was a problem deleting the event. Please try again." });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Upcoming': return 'info';
      case 'Completed': return 'default';
      case 'Cancelled': return 'danger';
      default: return 'warning';
    }
  };

  const columns: Column<Event>[] = [
    {
      key: 'name',
      title: 'Event Name',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <Link
            href={`/dashboard/events/${row.id}/schedule`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {value}
          </Link>
          {row.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'startDate',
      title: 'Date',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formatDateRange(value, row.endDate)}
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-slate-400" />
          {value}
        </div>
      ),
    },
    {
      key: 'participantCount',
      title: 'Participants',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-slate-400" />
          <span>
            {value || 0}/{row.maxParticipants || 50}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === 'Completed' ? 'outline' :
            value === 'Active' ? 'default' :
            value === 'Cancelled' ? 'destructive' : 'secondary'
          }
        >
          {value}
        </Badge>
      ),
    },
  ];

  const eventStats = {
    total: events.length,
    active: events.filter(e => e.status === 'Active').length,
    upcoming: events.filter(e => e.status === 'Upcoming').length,
    completed: events.filter(e => e.status === 'Completed').length,
  };

  if (loading) {
    return <LoadingScreen message="Loading events..." />;
  }

  return (
    <div className="space-y-6">
      {/* Event Statistics */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Event Management
        </h1>

        <StatsGrid>
          <StatsCard
            title="Total Events"
            value={eventStats.total}
            icon={Calendar}
            variant="default"
          />
          <StatsCard
            title="Active Events"
            value={eventStats.active}
            icon={Clock}
            variant="success"
            change={{ value: 12, type: "increase", period: "this week" }}
          />
          <StatsCard
            title="Upcoming Events"
            value={eventStats.upcoming}
            icon={Calendar}
            variant="info"
          />
          <StatsCard
            title="Completed Events"
            value={eventStats.completed}
            icon={Trophy}
            variant="default"
          />
        </StatsGrid>
      </div>

      {/* Events Data Table */}
      <DataTable
        data={events}
        columns={columns}
        title="Events"
        loading={loading}
        searchable={true}
        exportable={true}
        emptyMessage={
          isAdmin
            ? "No events found. Create your first event to get started."
            : "No events are currently available."
        }
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/events/${row.id}/schedule`}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>
            {isAdmin && (
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/events/${row.id}/schedule`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Event
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {row.name}? This action cannot be undone and will permanently remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(row.id, row.name)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
        className="bg-white dark:bg-slate-800"
      />

      {/* Create Event FAB */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6">
          <Button asChild size="lg" className="rounded-full shadow-lg">
            <Link href="/dashboard/events/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Event
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
