
"use client";

import { PlusCircle, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'judge' | 'competitor' | 'spectator';
    status: 'active' | 'pending';
    displayName?: string;
    photoURL?: string;
    createdAt?: Date;
}


export default function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { isAdmin } = useAuth();

    useEffect(() => {
        if (!isAdmin) { setLoading(false); return; }
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserProfile));
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch user data." });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [toast, isAdmin]);

    const handleDeleteUser = (userId: string) => {
        // Placeholder for delete functionality
        console.log("Deleting user:", userId);
        toast({ title: "Note", description: "Delete functionality not yet implemented." });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                    Manage and view all platform users.
                </CardDescription>
                </div>
                <InviteUserDialog />
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                         Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={`skel-user-${i}`}>
                                <TableCell className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell />
                            </TableRow>
                        ))
                    ) : users.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No users found. <InviteUserDialog triggerAsLink />
                        </TableCell>
                    </TableRow>
                    ) : (
                    users.map((user) => (
                        <TableRow key={user.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={user.photoURL} data-ai-hint="person portrait" />
                                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{user.displayName || 'User'}</div>
                                <div className="text-sm text-muted-foreground">
                                {user.email}
                                </div>
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        </TableCell>
                         <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="capitalize bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                {user.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                             <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">User Actions</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete User</span>
                                        </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the user <span className="font-bold">{user.email}</span>. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                                            Yes, delete user
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
