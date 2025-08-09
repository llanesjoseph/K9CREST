
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, getDocs, getDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { generateTimeSlots } from '@/lib/schedule-helpers';
import { Trash2, AlertTriangle, PlusCircle, Users, X, Eraser, Wand2, Clock, Loader2, FileDown, GripVertical, Upload, ListChecks } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { eachDayOfInterval, format, parse } from 'date-fns';
import { CompetitorImportDialog } from '@/components/competitor-import-dialog';
import { AddCompetitorDialog } from '@/components/add-competitor-dialog';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AssignRubricDialog } from '@/components/assign-rubric-dialog';
import { EditArenaDialog } from '@/components/edit-arena-dialog';

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
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AiScheduleDialog } from '@/components/ai-schedule-dialog';


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

export type ArenaSpecialty = 'Any' | 'Bite Work' | 'Detection (Narcotics)' | 'Detection (Explosives)';

export interface Arena {
    id: string;
    name: string;
    specialtyType: ArenaSpecialty;
    rubricId?: string;
    rubricName?: string;
}

export interface ScheduledEvent {
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
    scheduleBlockDuration?: number;
    lunchBreak?: { start: string; end: string };
}

interface Rubric {
    id: string;
    name: string;
}

type SchedulingStatus = 'unscheduled' | 'partiallyScheduled' | 'fullyScheduled';

interface DisplayCompetitor extends Competitor {
    status: SchedulingStatus;
    runs: ScheduledEvent[];
}

const SortableCompetitorItem = ({ competitor, isDraggable }: { competitor: DisplayCompetitor, isDraggable: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: competitor.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 0,
    };
    
    // Only allow dragging if the user is an admin
    const canDrag = isDraggable;

    return (
        <div ref={setNodeRef} style={style}>
            <CompetitorItem competitor={competitor} isDraggable={canDrag} dragHandle={canDrag ? {...attributes, ...listeners} : undefined} />
        </div>
    );
};


// --- CompetitorItem Component ---
const CompetitorItem = ({ competitor, isDraggable, dragHandle }: { competitor: DisplayCompetitor, isDraggable: boolean, dragHandle?: any }) => {
    
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

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) {
             e.preventDefault();
             return;
        }
        e.dataTransfer.setData('competitorId', competitor.id);
        e.dataTransfer.effectAllowed = 'move';
    };


    return (
        <div
            className={`border rounded-md p-3 mb-2 flex items-start gap-2 shadow-sm ${isDraggable ? 'hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-px' : ''} ${statusClasses[competitor.status]}`}
            draggable={isDraggable}
            onDragStart={handleDragStart}
        >
            {isDraggable && dragHandle && (
                 <button {...dragHandle} className="p-1 -ml-1 mt-1 cursor-grab focus:outline-none focus:ring-2 focus:ring-primary rounded">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                </button>
            )}
            <div className="w-full">
                <span className="font-semibold text-primary">{competitor.dogName}</span>
                <span className="text-sm text-muted-foreground"> ({competitor.name})</span>
                 <div className="text-xs text-muted-foreground/80">{competitor.agency}</div>
                 <div className="text-xs text-muted-foreground/80 mt-1">{getSpecialtyDisplay(competitor.specialties)}</div>
            </div>

            {competitor.runs.length > 0 && (
                <div className="w-full border-t border-dashed pt-2 mt-1 space-y-1">
                    {competitor.runs.map(run => (
                        <div key={run.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                             <span>
                                {format(parse(run.date, 'yyyy-MM-dd', new Date()), 'E, MMM dd')} @ {run.startTime}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- TimeSlot Component ---
const TimeSlot = ({
    arenaId,
    startTime,
    date,
    onDrop,
    scheduledEvent,
    competitors,
    removeScheduledEvent,
    isDraggable
}: {
    arenaId: string;
    startTime: string;
    date: string;
    onDrop: (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string, date: string) => void;
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
        onDrop(e, arenaId, startTime, date);
        setIsOver(false);
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable || !scheduledEvent) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('scheduleId', scheduledEvent.id);
        e.dataTransfer.setData('competitorId', scheduledEvent.competitorId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const eventCompetitor = scheduledEvent ? competitors.find(c => c.id === scheduledEvent.competitorId) : null;
    const canDragEvent = isDraggable && !!scheduledEvent;

    return (
        <div
            className={`w-32 h-20 border border-dashed rounded-md flex items-center justify-center text-center text-sm transition-all duration-200 ease-in-out relative
                ${scheduledEvent ? 'bg-green-100 dark:bg-green-900/30 border-green-500/50' : isDraggable ? 'bg-background hover:bg-muted/80' : 'bg-secondary/50'}
                ${isOver ? 'border-primary ring-2 ring-primary' : ''}
                ${canDragEvent ? 'cursor-grab' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            draggable={canDragEvent}
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
                            className="absolute top-0 right-0 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
    const { isAdmin, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const eventId = params.id as string;
    const sensors = useSensors(useSensor(PointerSensor));
    const [activeId, setActiveId] = useState<string | null>(null);

    // --- State Management ---
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [arenas, setArenas] = useState<Arena[]>([]);
    const [schedule, setSchedule] = useState<ScheduledEvent[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [rubrics, setRubrics] = useState<Rubric[]>([]);
    const [loading, setLoading] = useState({ event: true, arenas: true, schedule: true, competitors: true, rubrics: true });
    
    const [eventDays, setEventDays] = useState<Date[]>([]);
    
    const [newArenaName, setNewArenaName] = useState('');
    const [newArenaSpecialty, setNewArenaSpecialty] = useState<ArenaSpecialty>('Any');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('none');

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const scheduleContainerRef = useRef<HTMLDivElement>(null);

    const timeSlots = useMemo(() => generateTimeSlots({
        duration: eventDetails?.scheduleBlockDuration,
        lunchBreak: eventDetails?.lunchBreak,
    }), [eventDetails]);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!eventId || authLoading) return;

        setLoading(prev => ({ ...prev, event: true, arenas: true, schedule: true, competitors: true, rubrics: true }));

        const eventRef = doc(db, 'events', eventId);
        const eventUnsub = onSnapshot(eventRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as EventDetails;
                setEventDetails(data);
                const start = data.startDate.toDate();
                const end = data.endDate?.toDate() || start;
                setEventDays(eachDayOfInterval({ start, end }));
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Event not found.' });
            }
            setLoading(prev => ({ ...prev, event: false }));
        }, (error) => {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch event details.' });
            setLoading(prev => ({ ...prev, event: false }));
        });

        const rubricsUnsub = onSnapshot(collection(db, 'rubrics'), (snapshot) => {
            const rubricsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rubric));
            setRubrics(rubricsData);
            setLoading(prev => ({ ...prev, rubrics: false }));
        }, (error) => {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch rubrics.' });
            setLoading(prev => ({ ...prev, rubrics: false }));
        });

        // These listeners are for all authenticated users
        const scheduleUnsub = onSnapshot(collection(db, `events/${eventId}/schedule`), (snapshot) => {
            const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledEvent));
            setSchedule(scheduleData);
            setLoading(prev => ({ ...prev, schedule: false }));
        }, (error) => {
            console.error("Error fetching schedule:", error);
            toast({ variant: 'destructive', title: 'Error fetching schedule', description: error.message });
            setLoading(prev => ({ ...prev, schedule: false }));
        });

        const competitorsUnsub = onSnapshot(collection(db, `events/${eventId}/competitors`), (snapshot) => {
            const competitorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competitor));
            setCompetitors(competitorsData);
            setLoading(prev => ({ ...prev, competitors: false }));
        }, (error) => {
            console.error("Error fetching competitors:", error);
            toast({ variant: 'destructive', title: 'Error fetching competitors', description: error.message });
            setLoading(prev => ({ ...prev, competitors: false }));
        });
        
        const arenasUnsub = onSnapshot(collection(db, `events/${eventId}/arenas`), (snapshot) => {
            const arenasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Arena));
            setArenas(arenasData);
            setLoading(prev => ({ ...prev, arenas: false }));
        }, (error) => {
            console.error("Error fetching arenas:", error);
            toast({ variant: 'destructive', title: 'Error fetching arenas', description: error.message });
            setLoading(prev => ({ ...prev, arenas: false }));
        });

        return () => {
            eventUnsub();
            arenasUnsub();
            scheduleUnsub();
            competitorsUnsub();
            rubricsUnsub();
        };
    }, [eventId, toast, authLoading]);
    
    // --- Logic for competitor status and sorting ---
    const displayCompetitors = useMemo<DisplayCompetitor[]>(() => {
        const scheduledRunsByCompetitor = schedule.reduce((acc, run) => {
            if (!acc[run.competitorId]) {
                acc[run.competitorId] = [];
            }
            acc[run.competitorId].push(run);
            return acc;
        }, {} as Record<string, ScheduledEvent[]>);

        return competitors
            .map(comp => {
                const scheduledCount = (scheduledRunsByCompetitor[comp.id] || []).length;
                const requiredCount = comp.specialties.length > 0 ? comp.specialties.length : 1;
                let status: SchedulingStatus;

                if (scheduledCount === 0) {
                    status = 'unscheduled';
                } else if (scheduledCount >= requiredCount) {
                    status = 'fullyScheduled';
                } else {
                    status = 'partiallyScheduled';
                }
                
                return {
                    ...comp,
                    status,
                    runs: (scheduledRunsByCompetitor[comp.id] || []).sort((a,b) => 
                        new Date(a.date.replace(/-/g, '/')).getTime() - new Date(b.date.replace(/-/g, '/')).getTime() || a.startTime.localeCompare(b.startTime)
                    ),
                }
            });
    }, [competitors, schedule]);

    const [sortedCompetitors, setSortedCompetitors] = useState<DisplayCompetitor[]>([]);

    useEffect(() => {
        setSortedCompetitors(displayCompetitors);
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
            const selectedRubric = rubrics.find(r => r.id === selectedRubricId);
            await setDoc(newArenaRef, { 
                name: newArenaName.trim(), 
                specialtyType: newArenaSpecialty,
                rubricId: selectedRubric?.id || null,
                rubricName: selectedRubric?.name || null,
             });
            setNewArenaName('');
            setNewArenaSpecialty('Any');
            setSelectedRubricId('none');
            toast({ title: 'Success', description: `Arena "${newArenaName.trim()}" added!` });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not add arena.' });
        }
    };

    const removeArena = async (arena: Arena) => {
        if (!eventId) return;
        try {
            const batch = writeBatch(db);

            const scheduleQuery = query(collection(db, `events/${eventId}/schedule`), where("arenaId", "==", arena.id));
            const scheduleSnapshot = await getDocs(scheduleQuery);
            scheduleSnapshot.forEach(doc => {
                 batch.delete(doc.ref);
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
        const draggedScheduleId = e.dataTransfer.getData('scheduleId');
        
        if (!competitorId || !eventId) return;

        const competitor = competitors.find(comp => comp.id === competitorId);
        const targetArena = arenas.find(arena => arena.id === arenaId);

        if (!competitor || !targetArena) {
            toast({ variant: 'destructive', title: 'Error', description: 'Competitor or Arena not found.' });
            return;
        }
        
        // Prevent dropping in the same slot if moving
        if (draggedScheduleId) {
            const originalEvent = schedule.find(s => s.id === draggedScheduleId);
            if (originalEvent && originalEvent.arenaId === arenaId && originalEvent.startTime === startTime && originalEvent.date === date) {
                return; // Dropped on the same slot, do nothing
            }
        }

        // Check for conflicts in the target slot
        const conflict = schedule.find(event => event.id !== draggedScheduleId && event.arenaId === arenaId && event.startTime === startTime && event.date === date);
        if (conflict) {
            toast({ variant: 'destructive', title: 'Error', description: 'Time slot already occupied!' });
            return;
        }
        
        // Check for personal conflicts for the competitor
        const personalConflict = schedule.find(event => event.id !== draggedScheduleId && event.competitorId === competitorId && event.startTime === startTime && event.date === date);
        if (personalConflict) {
            const conflictingArena = arenas.find(a => a.id === personalConflict.arenaId);
            toast({ variant: 'destructive', title: 'Error', description: `${competitor.dogName} is already scheduled in ${conflictingArena?.name || 'another arena'} at this time.` });
            return;
        }
        
        // Check specialty matching
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

        // Create new schedule data
        const duration = eventDetails?.scheduleBlockDuration || 30;
        const endTime = new Date(new Date(`2000/01/01 ${startTime}`).getTime() + duration * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const newScheduleData = { competitorId, arenaId, startTime, endTime, date };

        try {
            if (draggedScheduleId) {
                // This is a MOVE operation
                const scheduleRef = doc(db, `events/${eventId}/schedule`, draggedScheduleId);
                await updateDoc(scheduleRef, { arenaId, startTime, endTime, date });
                toast({ title: 'Moved!', description: `${competitor.dogName} moved to ${targetArena.name} at ${startTime} on ${format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM dd')}.`});
            } else {
                // This is a NEW PLACEMENT
                const scheduleRef = doc(collection(db, `events/${eventId}/schedule`));
                await setDoc(scheduleRef, { ...newScheduleData, id: scheduleRef.id });
                toast({ title: 'Scheduled!', description: `${competitor.dogName} scheduled in ${targetArena.name} at ${startTime} on ${format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM dd')}.`});
            }
        } catch (error) {
             console.error("Error saving schedule:", error);
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

    const handleGeneratePdf = async () => {
        if (!eventDetails || !eventDays.length || !arenas.length || schedule.length === 0) return;
        setIsGeneratingPdf(true);

        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
            const docWidth = doc.internal.pageSize.getWidth();
            const docHeight = doc.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = docWidth - margin * 2;
            
            const arenaColors: Record<ArenaSpecialty, string> = {
                'Bite Work': '#ef4444',
                'Detection (Narcotics)': '#3b82f6',
                'Detection (Explosives)': '#f97316',
                'Any': '#8b5cf6'
            };

            const arenaIcons: Record<string, string> = {
                'Bite Work': '🔥',
                'Detection (Narcotics)': '👀',
                'Detection (Explosives)': '📄',
                'Any': '⭐'
            };


            const groupedSchedule = schedule.reduce((acc, run) => {
                const date = run.date;
                if (!acc[date]) acc[date] = {};
                const arena = arenas.find(a => a.id === run.arenaId);
                if (arena) {
                    if (!acc[date][arena.name]) acc[date][arena.name] = [];
                    acc[date][arena.name].push(run);
                }
                return acc;
            }, {} as Record<string, Record<string, ScheduledEvent[]>>);

            Object.values(groupedSchedule).forEach(daySchedule => {
                Object.values(daySchedule).forEach(runs => {
                    runs.sort((a, b) => a.startTime.localeCompare(b.startTime));
                });
            });

            const addPageHeader = (pageNumber: number, date: Date, isContinuation: boolean) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(20);
                doc.text(eventDetails.name, margin, margin);

                doc.setFontSize(16);
                const dateText = format(date, 'EEEE, MMMM dd, yyyy') + (isContinuation ? ' (cont.)' : '');
                doc.text(dateText, margin, margin + 25);
                doc.setDrawColor('#cccccc');
                doc.line(margin, margin + 35, docWidth - margin, margin + 35);
            };

            const addWatermark = () => {
                doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
                doc.setGState(new (doc as any).GState({ opacity: 1 }));
            };

            for (const day of eventDays) {
                const formattedDate = format(day, 'yyyy-MM-dd');
                const daySchedule = groupedSchedule[formattedDate];
                if (!daySchedule) continue;

                let isFirstPageOfDay = true;
                const dayArenas = arenas.filter(a => daySchedule[a.name] && daySchedule[a.name].length > 0);
                if (dayArenas.length === 0) continue;

                const numArenaColumns = dayArenas.length;
                const colWidth = (contentWidth - (numArenaColumns - 1) * 15) / numArenaColumns;
                let colCursors = dayArenas.map((_, i) => ({
                    x: margin + i * (colWidth + 15),
                    y: 0,
                    runIndex: 0
                }));
                
                let pageNumber = doc.getNumberOfPages();
                if(!isFirstPageOfDay) doc.addPage(); else if (day !== eventDays[0]) doc.addPage();
                addWatermark();
                addPageHeader(pageNumber, day, !isFirstPageOfDay);
                
                colCursors.forEach(c => c.y = margin + 85);
                
                dayArenas.forEach((arena, i) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor('#333333');
                    const icon = arenaIcons[arena.specialtyType] || '⭐';
                    doc.text(`${icon} ${arena.name}`, colCursors[i].x, margin + 70);
                });


                let runsLeftToDraw = dayArenas.some((arena) => (daySchedule[arena.name] || []).length > 0);
                while(runsLeftToDraw) {
                    runsLeftToDraw = false;
                    dayArenas.forEach((arena, colIndex) => {
                        const runs = daySchedule[arena.name] || [];
                        const cursor = colCursors[colIndex];

                        if(cursor.runIndex < runs.length) {
                            runsLeftToDraw = true;
                            const run = runs[cursor.runIndex];
                            const competitor = competitors.find(c => c.id === run.competitorId);
                            if (competitor) {
                                const cardHeight = 40;

                                if (cursor.y + cardHeight > docHeight - margin) {
                                    // This column is full, need a new page.
                                    return; // Will be handled by the outer loop check
                                }

                                const cardX = cursor.x;
                                const cardY = cursor.y;
                                
                                // Card color bar
                                doc.setFillColor(arenaColors[arena.specialtyType] || '#6b7280');
                                doc.rect(cardX, cardY, 3, cardHeight, 'F');
                                
                                // Card content
                                doc.setFont('helvetica', 'bold');
                                doc.setFontSize(9);
                                doc.setTextColor('#000000');
                                doc.text(`${run.startTime} - ${run.endTime}`, cardX + 10, cardY + 12);
            
                                doc.setFont('helvetica', 'normal');
                                doc.setFontSize(8);
                                doc.text(`${competitor.dogName} (${competitor.name})`, cardX + 10, cardY + 24);
                                doc.setTextColor('#6b7280');
                                doc.text(competitor.agency, cardX + 10, cardY + 34);

                                cursor.y += cardHeight + 8;
                                cursor.runIndex++;
                            }
                        }
                    });

                    // Check if a new page is needed because at least one column is full
                    const needsNewPage = colCursors.some((cursor, colIndex) => {
                        const runs = daySchedule[dayArenas[colIndex].name] || [];
                        if (cursor.runIndex < runs.length) {
                             const cardHeight = 40;
                             return cursor.y + cardHeight > docHeight - margin;
                        }
                        return false;
                    });
                    
                    if (needsNewPage && runsLeftToDraw) {
                        isFirstPageOfDay = false;
                        doc.addPage();
                        pageNumber++;
                        addWatermark();
                        addPageHeader(pageNumber, day, true); // It's a continuation page
                        
                        colCursors.forEach(c => c.y = margin + 85);
                        dayArenas.forEach((arena, i) => {
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(12);
                            doc.setTextColor('#333333');
                            const icon = arenaIcons[arena.specialtyType] || '⭐';
                            doc.text(`${icon} ${arena.name}`, colCursors[i].x, margin + 70);
                        });
                    }
                }
            }

            const totalPages = doc.getNumberOfPages();
            for (let j = 1; j <= totalPages; j++) {
                doc.setPage(j);
                doc.setFontSize(10);
                doc.setTextColor('#888888');
                doc.text(`Page ${j} of ${totalPages}`, docWidth / 2, docHeight - 20, { align: 'center' });
            }

            const fileName = `schedule_${eventDetails.name.replace(/\s+/g, '_') || eventId}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: "destructive", title: "PDF Generation Failed", description: "An unexpected error occurred." });
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            setSortedCompetitors((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const activeCompetitor = useMemo(() => sortedCompetitors.find(c => c.id === activeId), [activeId, sortedCompetitors]);

    const isFullyLoading = loading.arenas || loading.schedule || loading.competitors || loading.event || authLoading || loading.rubrics;

    // --- Render ---
    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 h-full min-h-[calc(100vh-theme(spacing.16))]">
                {/* Left Panel: Competitor List & Arena Mgmt */}
                 <div className="xl:col-span-1 flex flex-col gap-4">
                    <Card className="flex-grow flex flex-col h-full min-h-0">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Competitors</CardTitle>
                                 <CardDescription>Drag and drop competitors to re-order the list for scheduling priority.</CardDescription>
                            </div>
                            {isAdmin && (
                                <CompetitorImportDialog eventId={eventId} />
                            )}
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
                                              {isAdmin && (
                                                <div className="flex gap-2">
                                                    <AddCompetitorDialog eventId={eventId}/>
                                                    <CompetitorImportDialog eventId={eventId}/>
                                                </div>
                                              )}
                                          </div>
                                      ) : (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                            <SortableContext items={sortedCompetitors.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                                {sortedCompetitors.map(comp => (
                                                    <SortableCompetitorItem key={comp.id} competitor={comp} isDraggable={isAdmin} />
                                                ))}
                                            </SortableContext>
                                             <DragOverlay>
                                                {activeCompetitor ? <CompetitorItem competitor={activeCompetitor} isDraggable={isAdmin} /> : null}
                                            </DragOverlay>
                                        </DndContext>
                                      )}
                                  </>
                              )}
                               </ScrollArea>
                           </div>
                        </CardContent>
                        {isAdmin && competitors.length > 0 && (
                            <CardFooter className="border-t pt-4 flex-wrap gap-2">
                                <AddCompetitorDialog eventId={eventId}/>
                            </CardFooter>
                        )}
                    </Card>

                    {isAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Manage Arenas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input
                                    type="text"
                                    placeholder="New Arena Name"
                                    value={newArenaName}
                                    onChange={e => setNewArenaName(e.target.value)}
                                />
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Select value={newArenaSpecialty} onValueChange={(val: ArenaSpecialty) => setNewArenaSpecialty(val)}>
                                         <SelectTrigger>
                                            <SelectValue placeholder="Select specialty" />
                                         </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="Any">Any Specialty</SelectItem>
                                            <SelectItem value="Bite Work">Bite Work</SelectItem>
                                            <SelectItem value="Detection (Narcotics)">Detection (Narcotics)</SelectItem>
                                            <SelectItem value="Detection (Explosives)">Detection (Explosives)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                     <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Assign Rubric" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Rubric</SelectItem>
                                            {rubrics.map((rubric) => (
                                                <SelectItem key={rubric.id} value={rubric.id}>{rubric.name}</SelectItem>
                                            ))}
                                            <Separator />
                                            <AssignRubricDialog onRubricCreated={(id) => setSelectedRubricId(id)}>
                                                 <Button variant="ghost" className="w-full justify-start pl-2 font-normal">
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Rubric
                                                 </Button>
                                            </AssignRubricDialog>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={addArena} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Add Arena
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>


                {/* Right Panel: Scheduler */}
                <div className="xl:col-span-2 flex flex-col gap-4">
                    <Card className="flex-grow">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Event Schedule: {eventDetails?.name || <Skeleton className="h-6 w-48 inline-block" />}</CardTitle>
                                <CardDescription>Drop competitors into time slots, or use the AI assistant.</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                               {isAdmin && (
                                     <AiScheduleDialog 
                                        eventId={eventId}
                                        arenas={arenas}
                                        competitors={sortedCompetitors}
                                        eventDays={eventDays}
                                        timeSlots={timeSlots}
                                        currentSchedule={schedule}
                                     />
                                )}
                                <Button onClick={handleGeneratePdf} variant="outline" className="w-full" disabled={isGeneratingPdf || schedule.length === 0}>
                                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                                    Download as PDF
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
                             <div ref={scheduleContainerRef} className="overflow-x-auto relative pb-2 bg-card p-4">
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
                                            <div key={day.toISOString()}>
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
                                                        <div className="grid grid-flow-col auto-cols-fr gap-2 border-b-2 pb-2 sticky top-[4.2rem] bg-card z-10">
                                                            <div className="w-48 font-semibold text-muted-foreground">Arenas / Time</div>
                                                            {timeSlots.map(time => (
                                                                <div key={time} className="w-32 text-center font-semibold text-muted-foreground">{time}</div>
                                                            ))}
                                                        </div>

                                                        {/* Arena Rows */}
                                                        {arenas.map(arena => {
                                                            return (
                                                                <div key={arena.id} className="grid grid-flow-col auto-cols-fr gap-2 items-center border-b py-2">
                                                                    <div className="w-48 font-medium text-card-foreground flex items-center pr-2">
                                                                        <div className="flex-grow">
                                                                            <span className="font-bold">{arena.name}</span>
                                                                            <span className="text-xs text-muted-foreground block">({arena.specialtyType})</span>
                                                                             <div className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-1">
                                                                                <ListChecks className="h-3 w-3" /> 
                                                                                <span>{arena.rubricName || 'No Rubric'}</span>
                                                                                 {isAdmin && <EditArenaDialog eventId={eventId} arena={arena} rubrics={rubrics} />}
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <AlertDialog>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <AlertDialogTrigger asChild>
                                                                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive text-sm h-8 w-8">
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
                                                                            date={formattedDate}
                                                                            onDrop={(e, arenaId, startTime, date) => handleDrop(e, arenaId, startTime, date)}
                                                                            scheduledEvent={schedule.find(event => event.arenaId === arena.id && event.startTime === time && event.date === formattedDate)}
                                                                            competitors={competitors}
                                                                            removeScheduledEvent={removeScheduledEvent}
                                                                            isDraggable={isAdmin}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )
                                                        })}
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
