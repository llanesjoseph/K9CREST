
"use client";

import { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, AlertTriangle, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, writeBatch, doc, getDocs, getDoc } from 'firebase/firestore';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Arena, Competitor, ScheduledEvent } from '@/lib/schedule-types';
import { generateTimeSlots } from '@/lib/schedule-helpers';
import { postJSONWithRetry } from '@/lib/schedule-service';


interface AiScheduleDialogProps {
  eventId: string;
  arenas: Arena[];
  competitors: Competitor[];
  eventDays: Date[];
  currentSchedule: ScheduledEvent[];
}

enum ScheduleStep {
  Idle,
  Confirm,
  Generating,
  Complete,
  Error,
}

interface GeneratedRun {
    competitorId: string;
    arenaId: string;
    startTime: string;
    endTime: string;
    date: string;
}


export function AiScheduleDialog({ eventId, arenas, competitors, eventDays, currentSchedule }: AiScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ScheduleStep>(ScheduleStep.Idle);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedRun[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const eventDetailsRef = useRef<any>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
        if(eventId) {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (eventDoc.exists()) {
                eventDetailsRef.current = eventDoc.data();
            }
        }
    };
    fetchEventDetails();
  }, [eventId]);

  const handleGenerate = async () => {
    setStep(ScheduleStep.Generating);
    setError(null);
    try {
        const timeSlots = generateTimeSlots({
            duration: eventDetailsRef.current?.scheduleBlockDuration,
            lunchBreak: eventDetailsRef.current?.lunchBreak,
            eventStartTime: eventDetailsRef.current?.eventStartTime,
            eventEndTime: eventDetailsRef.current?.eventEndTime,
        });

        const input = {
            eventDays: eventDays.map(d => format(d, 'yyyy-MM-dd')),
            timeSlots,
            arenas,
            competitors,
        };
        
        const response = await postJSONWithRetry('/api/schedule', input);

        if (response.error) {
            throw new Error(response.error);
        }

        setGeneratedSchedule(response.schedule);
        setDiagnostics(response.diagnostics);
        setStep(ScheduleStep.Confirm);

    } catch (err: any) {
        console.error("Scheduling failed:", err);
        setError(`An error occurred during schedule generation: ${err.message}`);
        setStep(ScheduleStep.Error);
    }
  };

  const handleApplySchedule = async () => {
    setIsApplying(true);
    try {
        // First, clear existing schedule entries
        const existingScheduleQuery = await getDocs(collection(db, `events/${eventId}/schedule`));
        const batch = writeBatch(db);
        existingScheduleQuery.forEach(doc => batch.delete(doc.ref));

        // Then, add the new generated schedule
        generatedSchedule.forEach(run => {
            const newRunRef = doc(collection(db, `events/${eventId}/schedule`));
            batch.set(newRunRef, {
                ...run,
                id: newRunRef.id,
                status: 'scheduled',
            });
        });
        await batch.commit();

        toast({
            title: "Schedule Applied!",
            description: "The new schedule has been saved successfully.",
        });
        setStep(ScheduleStep.Complete);

    } catch (err) {
        console.error("Failed to apply schedule:", err);
        toast({
            variant: 'destructive',
            title: 'Error Applying Schedule',
            description: 'Could not save the new schedule. Please try again.',
        });
    } finally {
        setIsApplying(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          setTimeout(() => {
            setStep(ScheduleStep.Idle);
            setError(null);
            setGeneratedSchedule([]);
            setDiagnostics(null);
          }, 300);
      }
  }

  const handleClose = () => {
    handleOpenChange(false);
  };
  
  const isReady = arenas.length > 0 && competitors.length > 0 && eventDays.length > 0;

  const renderContent = () => {
    switch (step) {
      case ScheduleStep.Generating:
        return (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Generating Schedule...</p>
            <p className="text-sm text-muted-foreground">The AI is analyzing constraints and creating the optimal schedule. This may take a moment.</p>
          </div>
        );
      case ScheduleStep.Error:
        return (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-medium">Generation Failed</p>
            <p className="text-sm text-destructive mt-1 max-w-full break-words p-2 bg-destructive/10 rounded-md">{error}</p>
          </div>
        );
      case ScheduleStep.Confirm:
        return (
            <div>
                <p className="mb-4">
                    The AI has generated a schedule. Review the diagnostics below. Applying this will <strong className="text-destructive">overwrite any existing schedule data</strong>.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center border rounded-lg p-4">
                    <div>
                        <p className="text-2xl font-bold">{diagnostics?.requiredRuns || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Runs Required</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold text-green-600">{diagnostics?.placedRuns || 0}</p>
                        <p className="text-sm text-muted-foreground">Runs Successfully Placed</p>
                    </div>
                </div>
                 {diagnostics?.unplacedRuns?.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-destructive">Unplaced Runs ({diagnostics.unplacedRuns.length})</h4>
                        <ul className="text-sm text-destructive/90 list-disc pl-5 max-h-32 overflow-y-auto">
                            {diagnostics.unplacedRuns.map((run: any, i: number) => {
                                const competitor = competitors.find(c => c.id === run.competitorId);
                                return (
                                <li key={i}>{competitor?.name || 'Unknown'} ({run.specialtyType}): {run.reason}</li>
                                )
                            })}
                        </ul>
                    </div>
                )}
            </div>
        );
         case ScheduleStep.Complete:
            return (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                    <FileCheck2 className="mx-auto h-12 w-12 text-green-600" />
                    <p className="mt-4 font-medium">Schedule Applied!</p>
                    <p className="text-sm text-muted-foreground">You can now close this dialog and view the new schedule.</p>
                </div>
            );
      case ScheduleStep.Idle:
      default:
        return (
          <p>
            This tool will automatically generate a schedule based on your event settings, arenas, and competitors.
            It tries to ensure no competitor has overlapping runs.
            Click 'Generate' to begin.
          </p>
        );
    }
  };


  return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
              <Button disabled={!isReady} size="sm">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Schedule
              </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Automatic Scheduler</DialogTitle>
              <DialogDescription>
                Let AI create an optimized schedule for your event.
              </DialogDescription>
            </DialogHeader>
            
            {renderContent()}

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Close</Button>
               {step === ScheduleStep.Idle && <Button onClick={handleGenerate}>Generate</Button>}
               {step === ScheduleStep.Error && <Button onClick={handleGenerate}>Try Again</Button>}
               {step === ScheduleStep.Confirm && (
                <Button onClick={handleApplySchedule} disabled={isApplying} variant="destructive">
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Clear & Apply Schedule
                </Button>
               )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
  );
}
