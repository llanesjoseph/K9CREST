
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { generateTimeSlots } from '@/lib/schedule-helpers';
import { Trash2 } from 'lucide-react';

// --- State Structures ---
interface Specialty {
    type: 'Bite Work' | 'Detection';
    detectionType?: 'Narcotics' | 'Explosives';
}

interface Competitor {
    id: string;
    handlerName: string;
    k9Name: string;
    specialties: Specialty[];
}

interface Arena {
    id: string;
    name: string;
    specialtyType: 'Any' | 'Bite Work' | 'Detection';
}

interface ScheduledEvent {
    competitorId: string;
    arenaId: string;
    startTime: string;
    endTime: string;
}

// --- CompetitorItem Component ---
const CompetitorItem = ({ competitor }: { competitor: Competitor }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('competitorId', competitor.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const getSpecialtyDisplay = (specialties: Specialty[]) => {
        return specialties.map(s => {
            if (s.type === 'Detection' && s.detectionType) {
                return `${s.type} (${s.detectionType})`;
            }
            return s.type;
        }).join(', ');
    };

    return (
        <div
            className="bg-secondary border border-border rounded-md p-3 mb-2 cursor-grab flex flex-col items-center shadow-sm hover:shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1"
            draggable="true"
            onDragStart={handleDragStart}
        >
            <span className="font-semibold text-primary">{competitor.k9Name}</span>
            <span className="text-sm text-muted-foreground">({competitor.handlerName})</span>
            <span className="text-xs text-muted-foreground/80">{getSpecialtyDisplay(competitor.specialties)}</span>
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
}: {
    arenaId: string;
    startTime: string;
    onDrop: (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string) => void;
    scheduledEvent?: ScheduledEvent;
    competitors: Competitor[];
    removeScheduledEvent: (competitorId: string, arenaId: string, startTime: string) => void;
}) => {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        onDrop(e, arenaId, startTime);
    };

    const eventCompetitor = scheduledEvent ? competitors.find(c => c.id === scheduledEvent.competitorId) : null;

    return (
        <div
            className={`w-32 h-20 border border-dashed rounded-md flex items-center justify-center text-center text-sm transition duration-200 ease-in-out
        ${scheduledEvent ? 'bg-green-100 dark:bg-green-900/30 border-green-400' : 'bg-background hover:bg-muted/80'}
      `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {scheduledEvent && eventCompetitor ? (
                <div className="flex flex-col items-center justify-center p-1 relative group w-full h-full">
                    <span className="font-bold text-green-800 dark:text-green-300">{eventCompetitor.k9Name}</span>
                    <span className="text-xs text-green-700 dark:text-green-400">({eventCompetitor.handlerName})</span>
                    <button
                        onClick={() => removeScheduledEvent(scheduledEvent.competitorId, scheduledEvent.arenaId, scheduledEvent.startTime)}
                        className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 print-hide-controls"
                        title="Remove from schedule"
                    >
                        &times;
                    </button>
                </div>
            ) : (
                <span className="text-muted-foreground">Drop Here</span>
            )}
        </div>
    );
};


export default function SchedulePage() {
    // --- State Management ---
    const [competitors, setCompetitors] = useState<Competitor[]>([
        { id: 'comp-1', handlerName: 'Alice Johnson', k9Name: 'Max', specialties: [{ type: 'Bite Work' }] },
        { id: 'comp-2', handlerName: 'Bob Williams', k9Name: 'Bella', specialties: [{ type: 'Detection', detectionType: 'Narcotics' }] },
        { id: 'comp-3', handlerName: 'Charlie Brown', k9Name: 'Rocky', specialties: [{ type: 'Detection', detectionType: 'Explosives' }] },
        { id: 'comp-4', handlerName: 'Diana Prince', k9Name: 'Krypto', specialties: [{ type: 'Bite Work' }] },
        { id: 'comp-5', handlerName: 'Eve Adams', k9Name: 'Shadow', specialties: [{ type: 'Detection', detectionType: 'Narcotics' }] },
        { id: 'comp-6', handlerName: 'Frank Green', k9Name: 'Ace', specialties: [{ type: 'Bite Work' }, { type: 'Detection', detectionType: 'Explosives' }] },
    ]);

    const [arenas, setArenas] = useState<Arena[]>([
        { id: 'arena-1', name: 'Arena 1', specialtyType: 'Any' },
        { id: 'arena-2', name: 'Arena 2', specialtyType: 'Bite Work' },
        { id: 'arena-3', name: 'Arena 3', specialtyType: 'Detection' },
    ]);

    const [schedule, setSchedule] = useState<ScheduledEvent[]>([]);
    const [newArenaName, setNewArenaName] = useState('');
    const [newArenaSpecialty, setNewArenaSpecialty] = useState<'Any' | 'Bite Work' | 'Detection'>('Any');
    const [message, setMessage] = useState('');
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const timeSlots = generateTimeSlots();

    // --- Functions ---
    const showMessage = (msg: string, duration = 3000) => {
        setMessage(msg);
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        messageTimeoutRef.current = setTimeout(() => {
            setMessage('');
        }, duration);
    };

    const addArena = () => {
        if (newArenaName.trim() === '') {
            showMessage('Arena name cannot be empty!');
            return;
        }
        const newId = `arena-${Date.now()}`;
        setArenas([...arenas, { id: newId, name: newArenaName.trim(), specialtyType: newArenaSpecialty }]);
        setNewArenaName('');
        setNewArenaSpecialty('Any');
        showMessage(`Arena "${newArenaName.trim()}" (${newArenaSpecialty}) added!`);
    };

    const removeArena = (arenaId: string) => {
        setArenas(arenas.filter(arena => arena.id !== arenaId));
        setSchedule(schedule.filter(event => event.arenaId !== arenaId));
        showMessage('Arena removed!');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, arenaId: string, startTime: string) => {
        e.preventDefault();
        const competitorId = e.dataTransfer.getData('competitorId');
        const competitor = competitors.find(comp => comp.id === competitorId);
        const targetArena = arenas.find(arena => arena.id === arenaId);

        if (!competitor || !targetArena) {
            showMessage('Error: Competitor or Arena not found.');
            return;
        }

        const conflict = schedule.find(event => event.arenaId === arenaId && event.startTime === startTime);
        if (conflict) {
            showMessage('Time slot already occupied!');
            return;
        }
        
        const personalConflict = schedule.find(event => event.competitorId === competitorId && event.startTime === startTime);
        if (personalConflict) {
            const conflictingArena = arenas.find(a => a.id === personalConflict.arenaId);
            showMessage(`${competitor.k9Name} is already scheduled in ${conflictingArena?.name || 'another arena'} at this time.`);
            return;
        }


        const arenaSpecialty = targetArena.specialtyType;
        let isSpecialtyMatch = true;
        if (arenaSpecialty !== 'Any') {
            isSpecialtyMatch = competitor.specialties.some(s => s.type === arenaSpecialty);
        }

        if (!isSpecialtyMatch) {
            showMessage(`Cannot schedule ${competitor.k9Name}. ${targetArena.name} is for ${arenaSpecialty} only.`);
            return;
        }

        const endTime = new Date(new Date(`2000/01/01 ${startTime}`).getTime() + 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const newScheduleEntry = { competitorId, arenaId, startTime, endTime };

        setSchedule(prevSchedule => {
            const updatedSchedule = [...prevSchedule, newScheduleEntry];
            showMessage(`${competitor.k9Name} scheduled in ${targetArena.name} at ${startTime}.`);
            
            // Dual-Specialty Suggestion Logic
            if (competitor.specialties.length > 1) {
                const scheduledSpecialtyType = targetArena.specialtyType === 'Any' ? competitor.specialties[0].type : targetArena.specialtyType;
                const otherSpecialty = competitor.specialties.find(s => s.type !== scheduledSpecialtyType);

                if (otherSpecialty) {
                     const isOtherSpecialtyScheduled = updatedSchedule.some(event => {
                        const eventArena = arenas.find(a => a.id === event.arenaId);
                        return event.competitorId === competitorId && eventArena?.specialtyType === otherSpecialty.type;
                    });
                    if (!isOtherSpecialtyScheduled) {
                        showMessage(`Note: ${competitor.k9Name} also has a ${otherSpecialty.type} specialty. Consider scheduling them for that too!`, 6000);
                    }
                }
            }

            return updatedSchedule;
        });
    };

    const removeScheduledEvent = (competitorId: string, arenaId: string, startTime: string) => {
        setSchedule(prevSchedule =>
            prevSchedule.filter(
                event => !(event.competitorId === competitorId && event.arenaId === arenaId && event.startTime === startTime)
            )
        );
        showMessage('Scheduled event removed.');
    };

    const handlePrint = () => {
        window.print();
    };

    // --- Render ---
    return (
        <div className="min-h-screen p-4 flex flex-col md:flex-row gap-6">
            <style>{`
                @media print {
                    .print-hide { display: none; }
                    .print-expand { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
                    .print-visible { overflow: visible !important; }
                    body { font-size: 10pt; }
                    h2, h3, h4 { color: #000 !important; }
                    .grid > div { border-color: #ccc !important; }
                }
                @keyframes fade-in-down {
                    0% { opacity: 0; transform: translateY(-20px) translateX(-50%); }
                    100% { opacity: 1; transform: translateY(0) translateX(-50%); }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.5s ease-out forwards;
                }
            `}</style>

            {message && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down">
                    {message}
                </div>
            )}

            {/* Left Panel: Competitor List */}
            <div className="w-full md:w-1/3 bg-card rounded-lg shadow-md p-6 print-hide">
                <h2 className="text-2xl font-bold mb-4 text-center text-card-foreground">K9 Competitors</h2>
                <div className="space-y-4">
                    {['Bite Work', 'Detection'].map(specialty => (
                        <div key={specialty} className="border border-border rounded-lg p-3 bg-card">
                            <h3 className="text-xl font-semibold mb-3 text-primary">{specialty}</h3>
                            {specialty === 'Detection' ? (
                                <div className="space-y-3">
                                    {['Narcotics', 'Explosives'].map(detectionType => (
                                        <div key={detectionType} className="border border-border rounded-md p-2 bg-muted/50">
                                            <h4 className="text-lg font-medium mb-2 text-secondary-foreground">{detectionType}</h4>
                                            {competitors
                                                .filter(comp => comp.specialties.some(s => s.type === specialty && s.detectionType === detectionType))
                                                .map(comp => <CompetitorItem key={comp.id} competitor={comp} />)
                                            }
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {competitors
                                        .filter(comp => comp.specialties.some(s => s.type === specialty))
                                        .map(comp => <CompetitorItem key={comp.id} competitor={comp} />)
                                    }
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Scheduler */}
            <div className="w-full md:w-2/3 bg-card rounded-lg shadow-md p-6 print-expand">
                <h2 className="text-2xl font-bold mb-4 text-center text-card-foreground">Event Schedule</h2>

                <div className="mb-6 p-4 border border-border rounded-lg bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 print-hide">
                    <input
                        type="text"
                        placeholder="New Arena Name"
                        value={newArenaName}
                        onChange={e => setNewArenaName(e.target.value)}
                        className="flex-grow p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <select
                        value={newArenaSpecialty}
                        onChange={e => setNewArenaSpecialty(e.target.value as Arena['specialtyType'])}
                        className="p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="Any">Any Specialty</option>
                        <option value="Bite Work">Bite Work</option>
                        <option value="Detection">Detection</option>
                    </select>
                    <button onClick={addArena} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-md shadow-md">
                        Add Arena
                    </button>
                    <button onClick={handlePrint} className="bg-secondary text-secondary-foreground font-bold py-2 px-4 rounded-md shadow-md">
                        Print Schedule
                    </button>
                </div>

                <div className="overflow-x-auto print-visible">
                    <div className="grid gap-2 min-w-max">
                        <div className="grid grid-flow-col auto-cols-fr gap-2 border-b-2 border-border pb-2">
                            <div className="w-32 font-semibold text-muted-foreground">Arenas / Time</div>
                            {timeSlots.map(time => (
                                <div key={time} className="w-32 text-center font-semibold text-muted-foreground">{time}</div>
                            ))}
                        </div>

                        {arenas.map(arena => (
                            <div key={arena.id} className="grid grid-flow-col auto-cols-fr gap-2 items-center border-b border-border py-2">
                                <div className="w-32 font-medium text-card-foreground flex items-center pr-2">
                                     <div className="flex flex-col">
                                        <span>{arena.name}</span>
                                        <span className="text-xs text-muted-foreground">({arena.specialtyType})</span>
                                    </div>
                                    <button
                                        onClick={() => removeArena(arena.id)}
                                        className="text-muted-foreground hover:text-destructive text-sm print-hide ml-auto"
                                        title="Remove Arena"
                                    >
                                       <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                {timeSlots.map(time => (
                                    <TimeSlot
                                        key={`${arena.id}-${time}`}
                                        arenaId={arena.id}
                                        startTime={time}
                                        onDrop={handleDrop}
                                        scheduledEvent={schedule.find(event => event.arenaId === arena.id && event.startTime === time)}
                                        competitors={competitors}
                                        removeScheduledEvent={removeScheduledEvent}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

