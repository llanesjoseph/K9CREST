"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Download,
  Link2,
  Copy,
  UserPlus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Registration = {
  id: string;
  eventId: string;
  eventName: string;
  handlerName: string;
  handlerEmail: string;
  dogName: string;
  agency: string;
  specialties: any[];
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
};

export default function EventRegistrationsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    registration: Registration | null;
    action: 'approve' | 'reject' | 'delete' | null;
  }>({ open: false, registration: null, action: null });

  useEffect(() => {
    if (!eventId) return;

    // Load event name
    const loadEventName = async () => {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEventName(eventDoc.data()?.name || 'Event');
      }
    };
    loadEventName();

    // Subscribe to registrations
    const q = query(
      collection(db, 'registrations'),
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Registration[];

      // Sort by submission date (newest first)
      regs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      setRegistrations(regs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/register/${eventId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied!',
      description: 'Registration link copied to clipboard.',
    });
  };

  const handleApprove = async (registration: Registration) => {
    try {
      const batch = writeBatch(db);

      // Update registration status
      const regRef = doc(db, 'registrations', registration.id);
      batch.update(regRef, {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });

      // Add to competitors collection
      const competitorRef = doc(collection(db, `events/${eventId}/competitors`));
      batch.set(competitorRef, {
        name: registration.handlerName,
        dogName: registration.dogName,
        agency: registration.agency,
        specialties: registration.specialties,
        email: registration.handlerEmail,
        notes: registration.additionalInfo || '',
        registrationId: registration.id,
        addedAt: new Date().toISOString(),
      });

      await batch.commit();

      toast({
        title: 'Registration Approved',
        description: `${registration.handlerName} has been added to the event.`,
      });

      setActionDialog({ open: false, registration: null, action: null });
    } catch (error) {
      console.error('Error approving registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve registration.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (registration: Registration) => {
    try {
      await updateDoc(doc(db, 'registrations', registration.id), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Registration Rejected',
        description: `${registration.handlerName}'s registration has been rejected.`,
      });

      setActionDialog({ open: false, registration: null, action: null });
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject registration.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (registration: Registration) => {
    try {
      await deleteDoc(doc(db, 'registrations', registration.id));

      toast({
        title: 'Registration Deleted',
        description: `${registration.handlerName}'s registration has been deleted.`,
      });

      setActionDialog({ open: false, registration: null, action: null });
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete registration.',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Status', 'Handler', 'Email', 'K9', 'Agency', 'Specialties', 'Additional Info', 'Submitted'];
    const rows = registrations.map(reg => [
      reg.status,
      reg.handlerName,
      reg.handlerEmail,
      reg.dogName,
      reg.agency,
      reg.specialties.map(s => s.type === 'Detection' ? `${s.detectionType} Detection` : s.type).join('; '),
      reg.additionalInfo || '',
      new Date(reg.submittedAt).toLocaleString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName.replace(/\s+/g, '_')}_registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Registrations exported to CSV.',
    });
  };

  const confirmAction = () => {
    if (!actionDialog.registration || !actionDialog.action) return;

    switch (actionDialog.action) {
      case 'approve':
        handleApprove(actionDialog.registration);
        break;
      case 'reject':
        handleReject(actionDialog.registration);
        break;
      case 'delete':
        handleDelete(actionDialog.registration);
        break;
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don&apos;t have permission to view registrations.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Registrations</h1>
          <p className="text-muted-foreground mt-1">{eventName}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyRegistrationLink} variant="outline">
            <Link2 className="h-4 w-4 mr-2" />
            Copy Registration Link
          </Button>
          {registrations.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Registrations</CardTitle>
          <CardDescription>
            Review and approve competitor registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Registrations Yet</h3>
              <p className="text-muted-foreground">Share the registration link to start receiving submissions.</p>
              <Button onClick={copyRegistrationLink} className="mt-4" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy Registration Link
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>K9</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Specialties</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <Badge variant={
                        registration.status === 'approved' ? 'default' :
                        registration.status === 'rejected' ? 'destructive' :
                        'secondary'
                      }>
                        {registration.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{registration.handlerName}</div>
                        <div className="text-sm text-muted-foreground">{registration.handlerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{registration.dogName}</TableCell>
                    <TableCell>{registration.agency}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {registration.specialties.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {s.type === 'Detection' ? `${s.detectionType}` : s.type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(registration.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {registration.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ open: true, registration, action: 'approve' })}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve & Add to Event
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ open: true, registration, action: 'reject' })}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => setActionDialog({ open: true, registration, action: 'delete' })}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, registration: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === 'approve' && 'Approve Registration?'}
              {actionDialog.action === 'reject' && 'Reject Registration?'}
              {actionDialog.action === 'delete' && 'Delete Registration?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === 'approve' && `This will add ${actionDialog.registration?.handlerName} to the event as a competitor.`}
              {actionDialog.action === 'reject' && `This will mark ${actionDialog.registration?.handlerName}'s registration as rejected.`}
              {actionDialog.action === 'delete' && `This will permanently delete ${actionDialog.registration?.handlerName}'s registration.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionDialog.action === 'approve' && 'Approve'}
              {actionDialog.action === 'reject' && 'Reject'}
              {actionDialog.action === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
