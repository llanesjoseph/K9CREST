
"use client";

import { useState, useEffect } from "react";
import type { DocumentData } from "firebase/firestore";
import { collection, onSnapshot, query, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Hash } from "lucide-react";

import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompetitorImportDialog } from "@/components/competitor-import-dialog";
import { AddCompetitorDialog } from "@/components/add-competitor-dialog";
import type { Competitor, Specialty } from "@/lib/schedule-types";


interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
}

interface DisplayCompetitor extends Competitor {
    email?: string;
    photoURL?: string;
}

export default function CompetitorsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<DisplayCompetitor[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const competitorsQuery = query(collection(db, `events/${eventId}/competitors`));
    const usersQuery = query(collection(db, `users`));

    const unsubscribe = onSnapshot(competitorsQuery, async (competitorsSnap) => {
        const competitorsData = competitorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
        
        const usersSnap = await getDocs(usersQuery);
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        const userMap = new Map(usersData.map(u => [u.displayName, u]));

        const displayCompetitors = competitorsData.map(comp => {
            const user = userMap.get(comp.name);
            return {
                ...comp,
                email: user?.email,
                photoURL: user?.photoURL
            };
        });

        setCompetitors(displayCompetitors);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);
  
  const getSpecialtyDisplay = (specialties: Specialty[] = []) => {
    if (!specialties || specialties.length === 0) {
        return <Badge variant="outline">No Specialty</Badge>;
    }
    return specialties.map(s => {
        let label: string = s.type;
        if (s.type === 'Detection' && s.detectionType) {
            label = s.detectionType;
        }
        return <Badge key={label} variant="secondary">{label}</Badge>;
    })
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Competitor Roster</CardTitle>
          <CardDescription>
            A complete list of all competitors registered for this event.
          </CardDescription>
        </div>
        {isAdmin && (
            <div className="flex gap-2">
                <AddCompetitorDialog eventId={eventId} />
                <CompetitorImportDialog eventId={eventId} />
            </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">BIB</TableHead>
              <TableHead>Handler</TableHead>
              <TableHead>K9</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Specialties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                Array.from({length: 5}).map((_, i) => (
                    <TableRow key={`skel-comp-${i}`}>
                        <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    </TableRow>
                ))
            ) : competitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No competitors found for this event.
                </TableCell>
              </TableRow>
            ) : (
              competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="text-muted-foreground font-medium">
                    {competitor.bibNumber ? `#${competitor.bibNumber}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={competitor.photoURL} data-ai-hint="person portrait" />
                            <AvatarFallback>{competitor.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{competitor.name}</div>
                            <div className="text-sm text-muted-foreground">{competitor.email || 'No email on file'}</div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>{competitor.dogName}</TableCell>
                  <TableCell>{competitor.agency}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {getSpecialtyDisplay(competitor.specialties)}
                    </div>
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
