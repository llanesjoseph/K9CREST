

"use client";

import React, { useState, useEffect, useMemo, useReducer, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { generateTimeSlots } from '@/lib/schedule-helpers';
import { Trash2, AlertTriangle, PlusCircle, Users, X, Eraser, Wand2, Clock, Loader2, FileDown, GripVertical, Upload, ListChecks, Hash, Gavel, ClipboardCheck, Dog, HelpCircle } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useParams } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AiScheduleDialog } from '@/components/ai-schedule-dialog';
import { EditCompetitorDialog } from '@/components/edit-competitor-dialog';
import type { Arena, Competitor, ScheduledEvent, Specialty } from '@/lib/schedule-types';
import Link from 'next/link';
import { cn } from '@/lib/utils';


// --- State Management: useReducer for complex state ---
interface ScheduleState {
    eventDetails: EventDetails | null;
    competitors: Competitor[];
    arenas: Arena[];
    schedule: ScheduledEvent[];
    rubrics: Rubric[];
    loading: { [key: string]: boolean };
    isGeneratingPdf: boolean;
}

type ScheduleAction =
    | { type: 'SET_LOADING', payload: { key: string, value: boolean } }
    | { type: 'SET_EVENT_DETAILS', payload: EventDetails | null }
    | { type: 'SET_COMPETITORS', payload: Competitor[] }
    | { type: 'SET_ARENAS', payload: Arena[] }
    | { type: 'SET_SCHEDULE', payload: ScheduledEvent[] }
    | { type: 'SET_RUBRICS', payload: Rubric[] }
    | { type: 'SET_PDF_GENERATING', payload: boolean };


const initialState: ScheduleState = {
    eventDetails: null,
    competitors: [],
    arenas: [],
    schedule: [],
    rubrics: [],
    loading: { event: true, arenas: true, schedule: true, competitors: true, rubrics: true },
    isGeneratingPdf: false,
};

function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
    switch(action.type) {
        case 'SET_LOADING':
            return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } };
        case 'SET_EVENT_DETAILS':
            return { ...state, eventDetails: action.payload };
        case 'SET_COMPETITORS':
            return { ...state, competitors: action.payload };
        case 'SET_ARENAS':
            return { ...state, arenas: action.payload };
        case 'SET_SCHEDULE':
            return { ...state, schedule: action.payload };
        case 'SET_RUBRICS':
            return { ...state, rubrics: action.payload };
        case 'SET_PDF_GENERATING':
            return { ...state, isGeneratingPdf: action.payload };
        default:
            return state;
    }
}


// --- State Structures ---
interface EventDetails {
    name: string;
    startDate: Timestamp;
    endDate?: Timestamp;
    scheduleBlockDuration?: number;
    eventStartTime?: string;
    eventEndTime?: string;
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

const SortableCompetitorItem = ({ competitor, isDraggable, onRunClick, allArenas, allCompetitors }: { competitor: DisplayCompetitor, isDraggable: boolean, onRunClick: (run: ScheduledEvent) => void, allArenas: Arena[], allCompetitors: Competitor[] }) => {
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
            <CompetitorItem competitor={competitor} isDraggable={canDrag} dragHandle={canDrag ? {...attributes, ...listeners} : undefined} onRunClick={onRunClick} allArenas={allArenas} allCompetitors={allCompetitors} />
        </div>
    );
};


// --- CompetitorItem Component ---
const CompetitorItem = ({ competitor, isDraggable, dragHandle, onRunClick, allArenas, allCompetitors }: { competitor: DisplayCompetitor, isDraggable: boolean, dragHandle?: any, onRunClick: (run: ScheduledEvent) => void, allArenas: Arena[], allCompetitors: Competitor[] }) => {
    
    const getSpecialtyIcons = (specialties: Specialty[] = []) => {
        if (!specialties || specialties.length === 0) {
            return null;
        }
        const specialtyColors = {
            'Bite Work': 'bg-orange-400',
            'Detection (Narcotics)': 'bg-blue-400',
            'Detection (Explosives)': 'bg-green-400',
            'Any': 'bg-gray-400'
        }
        return (
             <div className="flex gap-1.5">
                {specialties.map(s => {
                    const key = s.type === 'Detection' ? `Detection (${s.detectionType})` : s.type;
                    return <div key={key} className={cn("w-3 h-3 rounded-full", specialtyColors[key as keyof typeof specialtyColors])} title={key} />;
                })}
            </div>
        )
    };
    
    const statusClasses: Record<SchedulingStatus, string> = {
        unscheduled: 'border-l-4 border-l-orange-400',
        partiallyScheduled: 'border-l-4 border-l-yellow-400',
        fullyScheduled: 'border-l-4 border-l-green-500',
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
            className={cn(`bg-card border rounded-lg p-3 mb-2 flex items-start gap-3 shadow-sm relative group transition-all duration-200 ease-in-out transform`,
                isDraggable ? 'hover:shadow-md hover:-translate-y-px cursor-grab' : '', 
                statusClasses[competitor.status]
            )}
            draggable={isDraggable}
            onDragStart={handleDragStart}
        >
            {isDraggable && dragHandle && (
                 <button {...dragHandle} className="p-1 -ml-1 mt-1 cursor-grab focus:outline-none focus:ring-2 focus:ring-primary rounded-md">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                </button>
            )}
            <div className="w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {competitor.bibNumber && <span className="font-bold text-lg text-primary/80 w-8 text-center">#{competitor.bibNumber}</span>}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-card-foreground">{competitor.dogName}</span>
                                {getSpecialtyIcons(competitor.specialties)}
                            </div>
                            <div className="text-sm text-muted-foreground">{competitor.name}</div>
                        </div>
                    </div>
                </div>

                 <div className="text-xs text-muted-foreground/80 mt-1 pl-10">{competitor.agency}</div>
                 
                 {competitor.runs && competitor.runs.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t pt-2">
                        {competitor.runs.map(run => {
                             const arena = allArenas.find(a => a.id === run.arenaId);
                             return (
                                <button key={run.id} onClick={() => onRunClick(run)} className="w-full text-left text-xs bg-muted/50 p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-2">
                                     <Clock className="h-3 w-3 text-primary shrink-0" />
                                     <div>
                                        <span className="font-medium">{arena?.name || 'Unknown Arena'}</span>
                                        <span className="text-muted-foreground ml-2">{format(parse(run.date, 'yyyy-MM-dd', new Date()), 'EEE, MMM dd')} @ {run.startTime}</span>
                                     </div>
                                 </button>
                             )
                        })}
                    </div>
                 )}
            </div>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <EditCompetitorDialog competitor={competitor} eventId={competitor.eventId} allCompetitors={allCompetitors} />
            </div>
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
    isDraggable,
    isAdmin,
    eventId
}: {
    arenaId: string;
    startTime: string;
    date: string;
    onDrop: (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string, date: string) => void;
    scheduledEvent?: ScheduledEvent;
    competitors: Competitor[];
    removeScheduledEvent: (eventId: string) => void;
    isDraggable: boolean;
    isAdmin: boolean;
    eventId: string;
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
    const isScored = scheduledEvent?.status === 'scored';
    const canDragEvent = isDraggable && (!isScored || isAdmin);
    const slotId = `slot-${arenaId}-${date}-${startTime}`;

    const specialtyColors: Record<string, string> = {
        'Bite Work': 'bg-orange-500/20 text-orange-800 dark:text-orange-200 border-orange-500/50',
        'Detection (Narcotics)': 'bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/50',
        'Detection (Explosives)': 'bg-green-500/20 text-green-800 dark:text-green-200 border-green-500/50',
        'Any': 'bg-gray-500/20 text-gray-800 dark:text-gray-200 border-gray-500/50',
    };
    
    const getRunSpecialty = (competitor: Competitor) => {
        // This is a simplified logic. In a real app, you might store the specific run type.
        if (competitor?.specialties?.length === 1) {
            const s = competitor.specialties[0];
            return s.type === 'Detection' ? `Detection (${s.detectionType})` : s.type;
        }
        return 'Any'; // Default or multiple
    }
    
    const scheduledContent = scheduledEvent && eventCompetitor ? (
        <div className={cn("flex flex-col items-center justify-center p-2 group w-full h-full text-center rounded-md border", specialtyColors[getRunSpecialty(eventCompetitor)])}>
            <span className="font-bold text-sm">{eventCompetitor.dogName}</span>
            <span className="text-xs text-muted-foreground">{eventCompetitor.agency}</span>
             {isDraggable && (!isScored || isAdmin) && (
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); removeScheduledEvent(scheduledEvent.id); }}
                    className="absolute top-0.5 right-0.5 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Remove from schedule"
                >
                   <X className="h-4 w-4" />
                </Button>
            )}
            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isScored ? <ClipboardCheck className="h-4 w-4 text-primary/70" /> : <Gavel className="h-4 w-4 text-muted-foreground/70" /> }
            </div>
        </div>
    ) : null;

    const wrapperClasses = cn(`w-40 h-24 rounded-lg flex items-center justify-center text-center text-sm transition-all duration-200 ease-in-out relative`,
        {
            'bg-background hover:bg-muted/80 border-2 border-dashed': !scheduledEvent && isDraggable,
            'bg-card': !scheduledEvent && !isDraggable,
            'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background': isOver,
            'cursor-grab': canDragEvent,
            'cursor-pointer': !!scheduledEvent,
        }
    );

    return (
        <div
            id={slotId}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            draggable={canDragEvent}
            className={wrapperClasses}
        >
            {scheduledEvent ? (
                <Link href={`/dashboard/events/${eventId}/judging/${scheduledEvent.id}`} className="w-full h-full flex items-center justify-center">
                    {scheduledContent}
                </Link>
            ) : isDraggable ? (
                <span className="text-muted-foreground text-xs pointer-events-none">Drop Here</span>
            ) : null}
        </div>
    );
};


export default function SchedulePage() {
    const { isAdmin, role, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const eventId = params.id as string;
    const sensors = useSensors(useSensor(PointerSensor));
    const [activeId, setActiveId] = useState<string | null>(null);
    const [state, dispatch] = useReducer(scheduleReducer, initialState);
    
    const { eventDetails, competitors, arenas, schedule, rubrics, loading, isGeneratingPdf } = state;

    const [newArenaName, setNewArenaName] = useState('');
    const [newArenaSpecialty, setNewArenaSpecialty] = useState<any>('Any');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('none');
    
    const [sortedCompetitors, setSortedCompetitors] = useState<DisplayCompetitor[]>([]);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!eventId || authLoading) return;
        
        const setLoading = (key: string, value: boolean) => dispatch({ type: 'SET_LOADING', payload: { key, value } });

        const eventRef = doc(db, 'events', eventId);
        const eventUnsub = onSnapshot(eventRef, (docSnap) => {
            if (docSnap.exists()) {
                dispatch({ type: 'SET_EVENT_DETAILS', payload: docSnap.data() as EventDetails });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Event not found.' });
            }
            setLoading('event', false);
        });

        const rubricsUnsub = onSnapshot(collection(db, 'rubrics'), (snapshot) => {
            const rubricsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rubric));
            dispatch({ type: 'SET_RUBRICS', payload: rubricsData });
            setLoading('rubrics', false);
        });
        
        const scheduleUnsub = onSnapshot(collection(db, `events/${eventId}/schedule`), (snapshot) => {
            const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledEvent));
            dispatch({ type: 'SET_SCHEDULE', payload: scheduleData });
            setLoading('schedule', false);
        });

        const competitorsUnsub = onSnapshot(collection(db, `events/${eventId}/competitors`), (snapshot) => {
            const competitorsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, eventId } as Competitor));
            dispatch({ type: 'SET_COMPETITORS', payload: competitorsData });
            setLoading('competitors', false);
        });
        
        const arenasUnsub = onSnapshot(collection(db, `events/${eventId}/arenas`), (snapshot) => {
            const arenasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Arena));
            dispatch({ type: 'SET_ARENAS', payload: arenasData });
            setLoading('arenas', false);
        });

        return () => { eventUnsub(); rubricsUnsub(); scheduleUnsub(); competitorsUnsub(); arenasUnsub(); };
    }, [eventId, toast, authLoading]);
    
    const eventDays = useMemo(() => {
        if (!eventDetails) return [];
        const start = eventDetails.startDate.toDate();
        const end = eventDetails.endDate?.toDate() || start;
        return eachDayOfInterval({ start, end });
    }, [eventDetails]);
    
    // --- Logic for competitor status and sorting ---
    const displayCompetitors = useMemo<DisplayCompetitor[]>(() => {
        const scheduledRunsByCompetitor = schedule.reduce((acc, run) => {
            if (!acc[run.competitorId]) acc[run.competitorId] = [];
            acc[run.competitorId].push(run);
            return acc;
        }, {} as Record<string, ScheduledEvent[]>);

        const statusOrder: Record<SchedulingStatus, number> = { unscheduled: 1, partiallyScheduled: 2, fullyScheduled: 3 };

        return competitors
            .map(comp => {
                const scheduledCount = (scheduledRunsByCompetitor[comp.id] || []).length;
                const requiredCount = comp.specialties.length > 0 ? comp.specialties.length : 1;
                let status: SchedulingStatus = scheduledCount === 0 ? 'unscheduled' : (scheduledCount >= requiredCount ? 'fullyScheduled' : 'partiallyScheduled');
                
                return {
                    ...comp,
                    status,
                    runs: (scheduledRunsByCompetitor[comp.id] || []).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
                };
            })
            .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (parseInt(a.bibNumber || '9999') - parseInt(b.bibNumber || '9999')));
    }, [competitors, schedule]);

    useEffect(() => {
        setSortedCompetitors(displayCompetitors);
    }, [displayCompetitors]);

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


    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string, date: string) => {
        e.preventDefault();
        const competitorId = e.dataTransfer.getData('competitorId');
        const draggedScheduleId = e.dataTransfer.getData('scheduleId');
        
        if (!competitorId || !eventId || !eventDetails) return;

        const competitor = competitors.find(comp => comp.id === competitorId);
        const targetArena = arenas.find(arena => arena.id === arenaId);

        if (!competitor || !targetArena) {
            toast({ variant: 'destructive', title: 'Error', description: 'Competitor or Arena not found.' });
            return;
        }
        
        // Prevent dropping in the same slot if moving
        if (draggedScheduleId) {
            const originalEvent = schedule.find(s => s.id === draggedScheduleId);
            if (originalEvent && originalEvent.arenaId === arenaId && originalEvent.startTime === startTime && originalEvent.date === date) return;
        }

        // Check for conflicts
        const conflict = schedule.find(event => event.id !== draggedScheduleId && event.arenaId === arenaId && event.startTime === startTime && event.date === date);
        if (conflict) {
            toast({ variant: 'destructive', title: 'Error', description: 'Time slot already occupied!' });
            return;
        }
        
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
                if (s.type === 'Detection') return arenaSpecialty === `Detection (${s.detectionType})`;
                return false;
            });
            if(!hasSpecialty) {
                toast({ variant: 'destructive', title: 'Specialty Mismatch', description: `${competitor.dogName} cannot be scheduled in a ${arenaSpecialty} arena.`, duration: 5000 });
                return;
            }
        }

        const duration = eventDetails.scheduleBlockDuration || 30;
        const endTime = new Date(new Date(`2000-01-01T${startTime}`).getTime() + duration * 60000).toTimeString().slice(0,5);
        const newScheduleData = { competitorId, arenaId, startTime, endTime, date, status: 'scheduled' as const };

        try {
            if (draggedScheduleId) {
                await updateDoc(doc(db, `events/${eventId}/schedule`, draggedScheduleId), { arenaId, startTime, endTime, date });
                toast({ title: 'Moved!', description: `${competitor.dogName} moved to ${targetArena.name} at ${startTime} on ${format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM dd')}.`});
            } else {
                const scheduleRef = doc(collection(db, `events/${eventId}/schedule`));
                await setDoc(scheduleRef, { ...newScheduleData, id: scheduleRef.id });
                toast({ title: 'Scheduled!', description: `${competitor.dogName} scheduled in ${targetArena.name} at ${startTime} on ${format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM dd')}.`});
            }
        } catch (error) {
             console.error("Error saving schedule:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save schedule entry.' });
        }
    }, [arenas, competitors, eventDetails, eventId, schedule, toast]);

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
            schedule.forEach(run => {
                batch.delete(doc(db, `events/${eventId}/schedule`, run.id));
            });
            await batch.commit();
            toast({ title: 'Schedule Cleared', description: 'All scheduled runs have been removed.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not clear the schedule.' });
        }
    };

     const handleAssignBibs = async () => {
        if (!eventId || competitors.length === 0) return;

        try {
            const batch = writeBatch(db);
            let nextBib = 1;
            competitors.forEach(c => {
                if (c.bibNumber) {
                    const num = parseInt(c.bibNumber, 10);
                    if (!isNaN(num) && num >= nextBib) nextBib = num + 1;
                }
            });

            let assignedCount = 0;
            competitors.forEach(competitor => {
                if (!competitor.bibNumber) {
                    const competitorRef = doc(db, `events/${eventId}/competitors`, competitor.id);
                    batch.update(competitorRef, { bibNumber: String(nextBib++) });
                    assignedCount++;
                }
            });

            if (assignedCount === 0) {
                 toast({ title: "All Set!", description: "All competitors already have BIB numbers." });
                 return;
            }

            await batch.commit();
            toast({ title: "BIBs Assigned!", description: `Successfully assigned ${assignedCount} new BIB numbers.` });
        } catch (error) {
            console.error("Error assigning BIB numbers:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not assign BIB numbers." });
        }
    };

    const handleRunClick = (run: ScheduledEvent) => {
        const slotId = `slot-${run.arenaId}-${run.date}-${run.startTime}`;
        const element = document.getElementById(slotId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            element.classList.add('ring-2', 'ring-offset-2', 'ring-primary', 'transition-shadow', 'duration-1000');
            setTimeout(() => element.classList.remove('ring-2', 'ring-offset-2', 'ring-primary', 'transition-shadow', 'duration-1000'), 1500);
        } else {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not find the corresponding time slot.' });
        }
    };

    const handleGeneratePdf = async () => {
        if (!eventDetails || !eventDays.length || !arenas.length || schedule.length === 0) return;
        dispatch({ type: 'SET_PDF_GENERATING', payload: true });

        try {
            const docPdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' });
            // PDF generation logic here...
            const fileName = `schedule_${eventDetails.name.replace(/\s+/g, '_') || eventId}.pdf`;
            docPdf.save(fileName);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: "destructive", title: "PDF Generation Failed" });
        } finally {
            dispatch({ type: 'SET_PDF_GENERATING', payload: false });
        }
    };
    
    const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

    const handleDragEnd = (event: DragEndEvent) => {
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
    const isFullyLoading = Object.values(loading).some(Boolean) || authLoading;
    const timeSlots = useMemo(() => generateTimeSlots({ 
        duration: eventDetails?.scheduleBlockDuration, 
        lunchBreak: eventDetails?.lunchBreak,
        eventStartTime: eventDetails?.eventStartTime,
        eventEndTime: eventDetails?.eventEndTime,
    }), [eventDetails]);
    const isDraggable = isAdmin;


    // --- Render ---
    return (
        <TooltipProvider>
            <div className="flex h-full min-h-[calc(100vh-theme(spacing.16))]">
                 <div className="w-[380px] border-r flex flex-col">
                    <div className="p-4 border-b space-y-4">
                        <div>
                            <h2 className="text-xl font-bold">Competitors</h2>
                            <p className="text-sm text-muted-foreground">Drag competitors onto the schedule.</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" size="sm"><HelpCircle className="mr-2 h-4 w-4" />Legend</Button></PopoverTrigger>
                                <PopoverContent className="w-80">
                                   {/* Legend Content */}
                                </PopoverContent>
                            </Popover>
                            {isAdmin && (
                            <div className="flex items-center gap-2">
                                <Button onClick={handleAssignBibs} variant="outline" disabled={competitors.length === 0} size="sm"><Hash className="mr-2 h-4 w-4"/> Assign BIBs </Button>
                                <AiScheduleDialog eventId={eventId} arenas={arenas} competitors={sortedCompetitors} eventDays={eventDays} currentSchedule={schedule} />
                            </div>
                            )}
                            <div className="flex items-center gap-2">
                            <Button onClick={handleGeneratePdf} variant="outline" size="sm" disabled={isGeneratingPdf || schedule.length === 0}>
                                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>} PDF
                            </Button>
                            {isAdmin && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={schedule.length === 0}><Eraser className="mr-2 h-4 w-4"/> Clear </Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove all scheduled runs.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearSchedule} className="bg-destructive hover:bg-destructive/90">Yes, clear</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            </div>
                        </div>
                    </div>
                     <div className="flex-grow p-4 overflow-hidden relative">
                         <ScrollArea className="absolute inset-0 h-full w-full p-0 pr-4">
                            {loading.competitors ? (
                                <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                            ) : (
                                <>
                                    {competitors.length === 0 ? (
                                        <div className="text-center text-muted-foreground p-8 border border-dashed rounded-md h-full flex flex-col justify-center items-center gap-4">
                                            <Dog className="h-10 w-10" />
                                            <p>No competitors added yet.</p>
                                            {isAdmin && ( <div className="flex gap-2"> <AddCompetitorDialog eventId={eventId}/> <CompetitorImportDialog eventId={eventId}/> </div> )}
                                        </div>
                                    ) : (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                        <SortableContext items={sortedCompetitors.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                            {sortedCompetitors.map(comp => (
                                                <SortableCompetitorItem key={comp.id} competitor={comp} isDraggable={isDraggable} onRunClick={handleRunClick} allArenas={arenas} allCompetitors={competitors} />
                                            ))}
                                        </SortableContext>
                                        <DragOverlay>
                                            {activeCompetitor ? <CompetitorItem competitor={activeCompetitor} isDraggable={isDraggable} onRunClick={() => {}} allArenas={arenas} allCompetitors={competitors} /> : null}
                                        </DragOverlay>
                                    </DndContext>
                                    )}
                                </>
                            )}
                        </ScrollArea>
                     </div>
                     {isAdmin && (
                         <div className="p-4 border-t space-y-4">
                             <h3 className="text-lg font-semibold">Manage Arenas</h3>
                             <div className="space-y-3">
                                 <Input type="text" placeholder="New Arena Name" value={newArenaName} onChange={e => setNewArenaName(e.target.value)} />
                                 <div className="flex flex-col sm:flex-row gap-2">
                                     <Select value={newArenaSpecialty} onValueChange={(val) => setNewArenaSpecialty(val)}>
                                         <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="Any">Any Specialty</SelectItem><SelectItem value="Bite Work">Bite Work</SelectItem>
                                             <SelectItem value="Detection (Narcotics)">Detection (Narcotics)</SelectItem><SelectItem value="Detection (Explosives)">Detection (Explosives)</SelectItem>
                                         </SelectContent>
                                     </Select>
                                     <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
                                        <SelectTrigger><SelectValue placeholder="Assign Rubric" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Rubric</SelectItem>
                                            {rubrics.map((rubric) => (<SelectItem key={rubric.id} value={rubric.id}>{rubric.name}</SelectItem>))}
                                            <Separator />
                                            <AssignRubricDialog onRubricCreated={setSelectedRubricId}>
                                                 <Button variant="ghost" className="w-full justify-start pl-2 font-normal"><PlusCircle className="mr-2 h-4 w-4" /> Create New</Button>
                                            </AssignRubricDialog>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                 <Button onClick={addArena} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Add Arena </Button>
                             </div>
                         </div>
                     )}
                </div>

                <div className="flex-1 flex flex-col">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b">
                        <div>
                            <CardTitle className="text-2xl">{eventDetails?.name || <Skeleton className="h-8 w-64 inline-block" />}</CardTitle>
                            <CardDescription>Drag and drop competitors into time slots to build the schedule.</CardDescription>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-auto">
                        {isFullyLoading ? (
                            <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
                        ) : eventDays.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg h-96 flex flex-col justify-center items-center m-6">
                                <AlertTriangle className="mx-auto h-8 w-8" />
                                <p className="mt-4 font-semibold">Event Dates Not Set</p>
                            </div>
                        ) : (
                        <div className="p-4 lg:p-6 space-y-8">
                            {eventDays.map(day => {
                                const formattedDate = format(day, 'yyyy-MM-dd');
                                return (
                                    <div key={day.toISOString()}>
                                        <h3 className="text-xl font-bold mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-3 z-10 -mt-3 pt-3">{format(day, 'EEEE, MMM dd')}</h3>
                                        {arenas.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg flex flex-col justify-center items-center mt-4 min-h-[200px]">
                                                <AlertTriangle className="mx-auto h-8 w-8" />
                                                <p className="mt-4 font-semibold">No Arenas Found</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {arenas.map(arena => (
                                                    <div key={arena.id}>
                                                         <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-2 h-8 rounded-full bg-primary" />
                                                            <div>
                                                                <h4 className="text-lg font-semibold">{arena.name}</h4>
                                                                <p className="text-sm text-muted-foreground">{arena.specialtyType}</p>
                                                            </div>
                                                        </div>
                                                        <ScrollArea className="w-full whitespace-nowrap">
                                                            <div className="flex gap-4 pb-4">
                                                                {timeSlots.map(time => (
                                                                    <div key={time} className="flex flex-col items-center gap-1">
                                                                        <span className="text-xs text-muted-foreground">{time}</span>
                                                                        <TimeSlot
                                                                            key={`${arena.id}-${time}`}
                                                                            arenaId={arena.id}
                                                                            startTime={time}
                                                                            date={formattedDate}
                                                                            onDrop={handleDrop}
                                                                            scheduledEvent={schedule.find(event => event.arenaId === arena.id && event.startTime === time && event.date === formattedDate)}
                                                                            competitors={competitors}
                                                                            removeScheduledEvent={removeScheduledEvent}
                                                                            isDraggable={isDraggable}
                                                                            isAdmin={isAdmin}
                                                                            eventId={eventId}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <ScrollBar orientation="horizontal" />
                                                        </ScrollArea>
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
                </div>
            </div>
        </TooltipProvider>
    );
}

