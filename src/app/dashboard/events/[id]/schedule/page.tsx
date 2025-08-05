

"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { generateTimeSlots } from '@/lib/schedule-helpers';
import { Trash2, GripVertical, AlertTriangle, PlusCircle, Users, X, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { eachDayOfInterval, format } from 'date-fns';
import { CompetitorImportDialog } from '@/components/competitor-import-dialog';
import { AddCompetitorDialog } from '@/components/add-competitor-dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


// --- State Structures ---
interface Specialty {
    type: 'Bite Work' | 'Detection';
    detectionType?: 'Narcotics' | 'Explosives';
}

export interface Competitor {
    id: string;
    name: string;
    dogName: string;
    agency: string;
    specialties: Specialty[];
}

type ArenaSpecialty = 'Any' | 'Bite Work' | 'Detection (Narcotics)' | 'Detection (Explosives)';

interface Arena {
    id: string;
    name: string;
    specialtyType: ArenaSpecialty;
}

interface ScheduledEvent {
    id: string;
    competitorId: string;
    arenaId: string;
    startTime: string;
    endTime: string;
    date: string; // YYYY-MM-DD format
}

interface EventDetails {
    name: string;
    startDate: Timestamp;
    endDate?: Timestamp;
}

type SchedulingStatus = 'unscheduled' | 'partiallyScheduled' | 'fullyScheduled';

interface DisplayCompetitor extends Competitor {
    status: SchedulingStatus;
}

// --- CompetitorItem Component ---
const CompetitorItem = ({ competitor, isDraggable }: { competitor: DisplayCompetitor, isDraggable: boolean }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('competitorId', competitor.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const getSpecialtyDisplay = (specialties: Specialty[] = []) => {
        if (!specialties || specialties.length === 0) {
            return "No specialty listed";
        }
        return specialties.map(s => {
            if (s.type === 'Detection' && s.detectionType) {
                return `${s.type} (${s.detectionType})`;
            }
            return s.type;
        }).join(', ');
    };
    
    const statusClasses = {
        unscheduled: 'bg-purple-100 dark:bg-purple-900/30 border-purple-500/30',
        partiallyScheduled: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500/30',
        fullyScheduled: 'bg-green-100 dark:bg-green-900/30 border-green-500/30',
    };

    return (
        <div
            className={`border rounded-md p-3 mb-2 flex items-center gap-3 shadow-sm ${isDraggable ? 'cursor-grab hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-px' : 'cursor-not-allowed opacity-70'} ${statusClasses[competitor.status]}`}
            draggable={isDraggable}
            onDragStart={handleDragStart}
        >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="flex-grow">
                <span className="font-semibold text-primary">{competitor.dogName}</span>
                <span className="text-sm text-muted-foreground"> ({competitor.name})</span>
                 <div className="text-xs text-muted-foreground/80">{competitor.agency}</div>
                 <div className="text-xs text-muted-foreground/80 mt-1">{getSpecialtyDisplay(competitor.specialties)}</div>
            </div>
        </div>
    );
};

// --- TimeSlot Component ---
const TimeSlot = ({
    arenaId,
    startTime,
    onDrop,
    scheduledEvent,
    competitors,
    removeScheduledEvent,
    isDraggable
}: {
    arenaId: string;
    startTime: string;
    onDrop: (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string) => void;
    scheduledEvent?: ScheduledEvent;
    competitors: Competitor[];
    removeScheduledEvent: (eventId: string) => void;
    isDraggable: boolean;
}) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isDraggable) setIsOver(true);
    };

    const handleDragLeave = () => {
        setIsOver(false);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) return;
        onDrop(e, arenaId, startTime);
        setIsOver(false);
    };

    const eventCompetitor = scheduledEvent ? competitors.find(c => c.id === scheduledEvent.competitorId) : null;

    return (
        <div
            className={`w-32 h-20 border border-dashed rounded-md flex items-center justify-center text-center text-sm transition-all duration-200 ease-in-out relative
                ${scheduledEvent ? 'bg-green-100 dark:bg-green-900/30 border-green-500/50' : isDraggable ? 'bg-background hover:bg-muted/80' : 'bg-secondary/50'}
                ${isOver ? 'border-primary ring-2 ring-primary' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {scheduledEvent && eventCompetitor ? (
                <div className="flex flex-col items-center justify-center p-1 group w-full h-full">
                    <span className="font-bold text-green-800 dark:text-green-300 text-sm">{eventCompetitor.dogName}</span>
                    <span className="text-xs text-green-700 dark:text-green-400">({eventCompetitor.name})</span>
                    {isDraggable && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeScheduledEvent(scheduledEvent.id)}
                            className="absolute top-0 right-0 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200 print-hide-controls"
                            title="Remove from schedule"
                        >
                           <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ) : isDraggable ? (
                <span className="text-muted-foreground text-xs">Drop Here</span>
            ) : null}
        </div>
    );
};


export default function SchedulePage() {
    const { isAdmin } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const eventId = params.id as string;

    // --- State Management ---
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [arenas, setArenas] = useState<Arena[]>([]);
    const [schedule, setSchedule] = useState<ScheduledEvent[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState({ event: true, arenas: true, schedule: true, competitors: true });
    
    const [eventDays, setEventDays] = useState<Date[]>([]);
    
    const [newArenaName, setNewArenaName] = useState('');
    const [newArenaSpecialty, setNewArenaSpecialty] = useState<ArenaSpecialty>('Any');

    const timeSlots = generateTimeSlots();

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!eventId) return;

        const fetchEventDetails = async () => {
             try {
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                if (eventSnap.exists()) {
                    const data = eventSnap.data() as EventDetails;
                    setEventDetails(data);
                    
                    const start = data.startDate.toDate();
                    const end = data.endDate?.toDate() || start;
                    const days = eachDayOfInterval({ start, end });
                    setEventDays(days);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Event not found.' });
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch event details.' });
            } finally {
                setLoading(prev => ({...prev, event: false}));
            }
        };
        fetchEventDetails();


        const arenasUnsub = onSnapshot(collection(db, `events/${eventId}/arenas`), (snapshot) => {
            const arenasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Arena));
            setArenas(arenasData);
            setLoading(prev => ({...prev, arenas: false}));
        }, (error) => {
            console.error("Error fetching arenas:", error);
            setLoading(prev => ({...prev, arenas: false}));
        });
        
        const scheduleUnsub = onSnapshot(collection(db, `events/${eventId}/schedule`), (snapshot) => {
            const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledEvent));
            setSchedule(scheduleData);
            setLoading(prev => ({...prev, schedule: false}));
        }, (error) => {
            console.error("Error fetching schedule:", error);
            setLoading(prev => ({...prev, schedule: false}));
        });

        const competitorsUnsub = onSnapshot(collection(db, `events/${eventId}/competitors`), (snapshot) => {
            const competitorsData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { 
                     id: doc.id,
                     name: data.name,
                     dogName: data.dogName,
                     agency: data.agency,
                     specialties: data.specialties || []
                 } as Competitor;
            });
            setCompetitors(competitorsData);
            setLoading(prev => ({...prev, competitors: false}));
        }, (error) => {
            console.error("Error fetching competitors:", error);
            setLoading(prev => ({...prev, competitors: false}));
        });


        return () => {
            arenasUnsub();
            scheduleUnsub();
            competitorsUnsub();
        };

    }, [eventId, toast]);
    
    // --- Logic for competitor status and sorting ---
    const displayCompetitors = useMemo<DisplayCompetitor[]>(() => {
        const statusMap: { [key: string]: SchedulingStatus } = {};

        const getArenaSpecialtyForRun = (arenaId: string): ArenaSpecialty => {
            const arena = arenas.find(a => a.id === arenaId);
            return arena ? arena.specialtyType : 'Any';
        };

        const scheduledSpecialtiesForCompetitor = schedule.reduce((acc, run) => {
            if (!acc[run.competitorId]) {
                acc[run.competitorId] = new Set();
            }
            const arenaSpecialty = getArenaSpecialtyForRun(run.arenaId);
            if (arenaSpecialty !== 'Any') {
                acc[run.competitorId].add(arenaSpecialty);
            }
            return acc;
        }, {} as Record<string, Set<string>>);
        
        competitors.forEach(comp => {
            const requiredSpecialties = new Set(comp.specialties.map(s => s.type === 'Detection' ? `Detection (${s.detectionType})` : s.type));
            const scheduledSpecialties = scheduledSpecialtiesForCompetitor[comp.id] || new Set();

            if (scheduledSpecialties.size === 0 && requiredSpecialties.size > 0) {
                 statusMap[comp.id] = 'unscheduled';
            } else if (requiredSpecialties.size > 0 && scheduledSpecialties.size >= requiredSpecialties.size) {
                 // Check if all required are met
                const allMet = Array.from(requiredSpecialties).every(req => scheduledSpecialties.has(req));
                statusMap[comp.id] = allMet ? 'fullyScheduled' : 'partiallyScheduled';
            } else if (scheduledSpecialties.size > 0) {
                 statusMap[comp.id] = 'partiallyScheduled';
            } else {
                 statusMap[comp.id] = 'unscheduled';
            }
        });

        const statusOrder: Record<SchedulingStatus, number> = {
            'partiallyScheduled': 1,
            'unscheduled': 2,
            'fullyScheduled': 3,
        };

        return competitors
            .map(comp => ({
                ...comp,
                status: statusMap[comp.id] || 'unscheduled',
            }))
            .sort((a, b) => {
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;
                return a.name.localeCompare(b.name);
            });
    }, [competitors, schedule, arenas]);

    const groupedCompetitors = useMemo(() => {
        const groups: { [key: string]: DisplayCompetitor[] } = {
            'Bite Work': [],
            'Detection (Narcotics)': [],
            'Detection (Explosives)': [],
            'No Specialty': []
        };

        displayCompetitors.forEach(comp => {
            if (comp.specialties.length === 0) {
                groups['No Specialty'].push(comp);
                return;
            }
            comp.specialties.forEach(spec => {
                if (spec.type === 'Bite Work') {
                    groups['Bite Work'].push(comp);
                } else if (spec.type === 'Detection') {
                    if (spec.detectionType === 'Narcotics') {
                        groups['Detection (Narcotics)'].push(comp);
                    } else if (spec.detectionType === 'Explosives') {
                        groups['Detection (Explosives)'].push(comp);
                    }
                }
            });
        });

        return groups;
    }, [displayCompetitors]);

    // --- Functions ---
    const addArena = async () => {
        if (newArenaName.trim() === '') {
            toast({ variant: 'destructive', title: 'Error', description: 'Arena name cannot be empty!' });
            return;
        }
        if (!eventId) return;

        const newArenaRef = doc(collection(db, `events/${eventId}/arenas`));
        try {
            await setDoc(newArenaRef, { name: newArenaName.trim(), specialtyType: newArenaSpecialty });
            setNewArenaName('');
            setNewArenaSpecialty('Any');
            toast({ title: 'Success', description: `Arena "${newArenaName.trim()}" added!` });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not add arena.' });
        }
    };

    const removeArena = async (arena: Arena) => {
        if (!eventId) return;
        try {
            const batch = writeBatch(db);

            const scheduleQuery = query(collection(db, `events/${eventId}/schedule`));
            const scheduleSnapshot = await getDocs(scheduleQuery);
            scheduleSnapshot.forEach(doc => {
                if (doc.data().arenaId === arena.id) {
                    batch.delete(doc.ref);
                }
            });

            const arenaRef = doc(db, `events/${eventId}/arenas`, arena.id);
            batch.delete(arenaRef);

            await batch.commit();

            toast({ title: 'Success', description: `Arena "${arena.name}" and its schedule have been removed.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove arena.' });
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string, date: string) => {
        e.preventDefault();
        const competitorId = e.dataTransfer.getData('competitorId');
        const competitor = competitors.find(comp => comp.id === competitorId);
        const targetArena = arenas.find(arena => arena.id === arenaId);

        if (!competitor || !targetArena || !eventId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Competitor or Arena not found.' });
            return;
        }
        
        const conflict = schedule.find(event => event.arenaId === arenaId && event.startTime === startTime && event.date === date);
        if (conflict) {
            toast({ variant: 'destructive', title: 'Error', description: 'Time slot already occupied!' });
            return;
        }
        
        const personalConflict = schedule.find(event => event.competitorId === competitorId && event.startTime === startTime && event.date === date);
        if (personalConflict) {
            const conflictingArena = arenas.find(a => a.id === personalConflict.arenaId);
            toast({ variant: 'destructive', title: 'Error', description: `${competitor.dogName} is already scheduled in ${conflictingArena?.name || 'another arena'} at this time.` });
            return;
        }

        const arenaSpecialty = targetArena.specialtyType;
        if (arenaSpecialty !== 'Any') {
            const hasSpecialty = competitor.specialties.some(s => {
                if (s.type === 'Bite Work' && arenaSpecialty === 'Bite Work') return true;
                if (s.type === 'Detection') {
                    if (arenaSpecialty === `Detection (${s.detectionType})`) return true;
                }
                return false;
            });
            if(!hasSpecialty) {
                toast({ variant: 'destructive', title: 'Specialty Mismatch', description: `${competitor.dogName} cannot be scheduled. ${targetArena.name} is for ${arenaSpecialty}.`, duration: 5000 });
                return;
            }
        }

        const endTime = new Date(new Date(`2000/01/01 ${startTime}`).getTime() + 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const scheduleRef = doc(collection(db, `events/${eventId}/schedule`));
        const newScheduleEntry = { id: scheduleRef.id, competitorId, arenaId, startTime, endTime, date };
        
        try {
            await setDoc(scheduleRef, newScheduleEntry);
            toast({ title: 'Scheduled!', description: `${competitor.dogName} scheduled in ${targetArena.name} at ${startTime} on ${format(new Date(date.replace(/-/g, '/')), 'MMM dd')}.`});
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save schedule entry.' });
        }
    };

    const removeScheduledEvent = async (scheduleId: string) => {
        if (!eventId) return;
        try {
            await deleteDoc(doc(db, `events/${eventId}/schedule`, scheduleId));
            toast({ title: 'Success', description: 'Scheduled event removed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove scheduled event.' });
        }
    };
    
    const handleClearSchedule = async () => {
        if (!eventId) return;
        try {
            const batch = writeBatch(db);
            const scheduleQuery = query(collection(db, `events/${eventId}/schedule`));
            const scheduleSnapshot = await getDocs(scheduleQuery);

            if (scheduleSnapshot.empty) {
                toast({ title: 'Schedule Already Clear', description: 'There are no scheduled runs to remove.' });
                return;
            }

            scheduleSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            toast({ title: 'Schedule Cleared', description: 'All scheduled runs have been removed.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not clear the schedule.' });
        }
    };

    const handlePrint = () => {
        window.print();
    };
    
    const isFullyLoading = loading.arenas || loading.schedule || loading.competitors || loading.event;

    // --- Render ---
    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 h-full min-h-[calc(100vh-theme(spacing.16))]">
                <style>{`
                    @media print {
                        body { font-size: 10pt; }
                        .print-hide { display: none !important; }
                        .print-expand { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                        .print-visible { overflow: visible !important; }
                        .print-no-bg { background-color: transparent !important; }
                         h1, h2, h3, h4 { color: #000 !important; }
                        .print-break-inside-avoid { page-break-inside: avoid; }
                        .schedule-grid { margin-bottom: 2rem; }
                    }
                `}</style>

                {/* Left Panel: Competitor List & Arena Mgmt */}
                 <div className="xl:col-span-1 flex flex-col gap-4 print-hide">
                    <Card className="flex-grow flex flex-col h-full min-h-0">
                        <CardHeader>
                            <CardTitle>Competitors</CardTitle>
                             <CardDescription>Drag competitors to the schedule. Colors indicate status.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow p-0 overflow-hidden relative">
                           <div className="absolute inset-0">
                             <ScrollArea className="h-full w-full p-6">
                              {loading.competitors ? (
                                  <div className="space-y-2">
                                      <Skeleton className="h-20 w-full" />
                                      <Skeleton className="h-20 w-full" />
                                      <Skeleton className="h-20 w-full" />
                                  </div>
                              ) : (
                                  <>
                                      {competitors.length === 0 ? (
                                          <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md h-full flex flex-col justify-center items-center gap-4">
                                              <p>No competitors have been imported for this event yet.</p>
                                              {isAdmin && <CompetitorImportDialog eventId={eventId} />}
                                          </div>
                                      ) : (
                                          <div className="space-y-4">
                                             {Object.entries(groupedCompetitors).map(([groupName, groupCompetitors]) => (
                                                groupCompetitors.length > 0 && (
                                                <div key={groupName}>
                                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{groupName}</h4>
                                                    <Separator className="mb-3"/>
                                                    <div className="space-y-2">
                                                        {groupCompetitors.map(comp => (
                                                            <CompetitorItem key={comp.id} competitor={comp} isDraggable={isAdmin} />
                                                        ))}
                                                    </div>
                                                </div>
                                                )
                                             ))}
                                          </div>
                                      )}
                                  </>
                              )}
                               </ScrollArea>
                           </div>
                        </CardContent>
                        {isAdmin && competitors.length > 0 && (
                            <CardFooter className="border-t pt-4 flex-wrap gap-2">
                                <AddCompetitorDialog eventId={eventId}/>
                                <CompetitorImportDialog eventId={eventId} />
                            </CardFooter>
                        )}
                    </Card>

                    {isAdmin && (
                        <Card className="print-hide">
                            <CardHeader>
                                <CardTitle>Manage Arenas</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col sm:flex-row items-center gap-2">
                                <Input
                                    type="text"
                                    placeholder="New Arena Name"
                                    value={newArenaName}
                                    onChange={e => setNewArenaName(e.target.value)}
                                    className="flex-grow"
                                />
                                <Select value={newArenaSpecialty} onValueChange={(val: ArenaSpecialty) => setNewArenaSpecialty(val)}>
                                     <SelectTrigger className="w-full sm:w-[240px]">
                                        <SelectValue placeholder="Select specialty" />
                                     </SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="Any">Any Specialty</SelectItem>
                                        <SelectItem value="Bite Work">Bite Work</SelectItem>
                                        <SelectItem value="Detection (Narcotics)">Detection (Narcotics)</SelectItem>
                                        <SelectItem value="Detection (Explosives)">Detection (Explosives)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={addArena} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Add Arena
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>


                {/* Right Panel: Scheduler */}
                <div className="xl:col-span-2 flex flex-col gap-4 print-expand">
                    <Card className="flex-grow print-expand">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hide">
                            <div>
                                <CardTitle>Event Schedule: {eventDetails?.name || <Skeleton className="h-6 w-48 inline-block" />}</CardTitle>
                                <CardDescription>Drag and drop competitors to build the schedule for each day.</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button onClick={handlePrint} variant="outline" className="w-full">
                                    Print Schedule
                                </Button>
                                {isAdmin && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" className="w-full" disabled={schedule.length === 0}>
                                                <Eraser className="mr-2 h-4 w-4"/>
                                                Clear Schedule
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove all scheduled runs for this event. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleClearSchedule} className="bg-destructive hover:bg-destructive/90">
                                                    Yes, clear schedule
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto print-visible relative pb-2">
                                {isFullyLoading ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-24 w-full" />
                                        <Skeleton className="h-24 w-full" />
                                    </div>
                                ) : eventDays.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg h-96 flex flex-col justify-center items-center">
                                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                                        <p className="mt-4 font-semibold">Event Dates Not Set</p>
                                        <p>The start and end dates for this event have not been configured.</p>
                                    </div>
                                ) : (
                                <div className="space-y-8">
                                    {eventDays.map(day => {
                                        const formattedDate = format(day, 'yyyy-MM-dd');
                                        return (
                                            <div key={day.toISOString()} className="schedule-grid">
                                                <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-card py-2 z-20">{format(day, 'EEEE, MMM dd')}</h3>
                                                {arenas.length === 0 ? (
                                                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg h-96 flex flex-col justify-center items-center mt-4">
                                                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                                                        <p className="mt-4 font-semibold">No Arenas Found</p>
                                                        {isAdmin ? (
                                                            <p>Use the 'Manage Arenas' section to create one.</p>
                                                        ) : (
                                                            <p>The event administrator has not set up any arenas yet.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-2 min-w-max">
                                                        {/* Header Row: Time Slots */}
                                                        <div className="grid grid-flow-col auto-cols-fr gap-2 border-b-2 pb-2 sticky top-[4.2rem] bg-card z-10 print-no-bg">
                                                            <div className="w-32 font-semibold text-muted-foreground">Arenas / Time</div>
                                                            {timeSlots.map(time => (
                                                                <div key={time} className="w-32 text-center font-semibold text-muted-foreground">{time}</div>
                                                            ))}
                                                        </div>

                                                        {/* Arena Rows */}
                                                        {arenas.map(arena => (
                                                            <div key={arena.id} className="grid grid-flow-col auto-cols-fr gap-2 items-center border-b py-2 print-break-inside-avoid">
                                                                <div className="w-32 font-medium text-card-foreground flex items-center pr-2">
                                                                    <div className="flex-grow">
                                                                        <span>{arena.name}</span>
                                                                        <span className="text-xs text-muted-foreground block">({arena.specialtyType})</span>
                                                                    </div>
                                                                    {isAdmin && (
                                                                        <AlertDialog>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive text-sm print-hide h-8 w-8">
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </AlertDialogTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>Remove Arena</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        This will remove the arena "{arena.name}" and all of its scheduled runs. This action cannot be undone.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => removeArena(arena)}>Delete</AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    )}
                                                                </div>
                                                                {timeSlots.map(time => (
                                                                    <TimeSlot
                                                                        key={`${arena.id}-${time}`}
                                                                        arenaId={arena.id}
                                                                        startTime={time}
                                                                        onDrop={(e, arenaId, startTime) => handleDrop(e, arenaId, startTime, formattedDate)}
                                                                        scheduledEvent={schedule.find(event => event.arenaId === arena.id && event.startTime === time && event.date === formattedDate)}
                                                                        competitors={competitors}
                                                                        removeScheduledEvent={removeScheduledEvent}
                                                                        isDraggable={isAdmin}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}
