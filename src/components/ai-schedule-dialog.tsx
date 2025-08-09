
"use client";

import { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, AlertTriangle, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';

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


interface AiScheduleDialogProps {
  eventId: string;
  arenas: Arena[];
  competitors: Competitor[];
  eventDays: Date[];
  timeSlots: string[];
  currentSchedule: ScheduledEvent[];
}

enum ScheduleStep {
  Idle,
  Confirm,
  Generating,
  Complete,
  Error,
}

async function postJSONWithRetry<T>(url: string, body: unknown, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      if (!/application\/json/.test(res.headers.get('content-type') || '')) {
        throw new Error(`Non-JSON from server`);
      }
      return JSON.parse(text);
    } catch (e: any) {
      lastErr = e;
      const msg = String(e.message || '');
      const is429 = /HTTP 429/.test(msg) || /Quota|rate limit/i.test(msg);
      const is5xx = /HTTP 5\d{2}/.test(msg);
      if (i < tries - 1 && (is429 || is5xx)) {
        await new Promise(r => setTimeout(r, 600 * (i + 1))); // 600ms, 1200ms
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}


export function AiScheduleDialog({ eventId, arenas, competitors, eventDays, timeSlots, currentSchedule }: AiScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ScheduleStep>(ScheduleStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => contentRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (open) {
          if (currentSchedule.length > 0) {
              setStep(ScheduleStep.Confirm);
          } else {
              setStep(ScheduleStep.Idle);
          }
      } else {
          // Reset state when closing
          setTimeout(() => {
            setStep(ScheduleStep.Idle);
            setError(null);
          }, 300);
      }
  }

  const handleClose = () => {
    handleOpenChange(false);
  };
  
  const handleGenerateSchedule = async () => {
      setStep(ScheduleStep.Generating);
      setError(null);

      try {
          const formattedEventDays = eventDays.map(day => format(day, 'yyyy-MM-dd'));
          
          const sanitizedCompetitors = competitors.map(c => ({
            id: c.id,
            name: c.name,
            dogName: c.dogName,
            agency: c.agency,
            specialties: c.specialties || []
          }));

          const payload = {
              competitors: sanitizedCompetitors,
              arenas,
              eventDays: formattedEventDays,
              timeSlots
          };

          const result = await postJSONWithRetry<{schedule: any[], diagnostics?: any}>('/api/schedule', payload);
          
          if(!result || !result.schedule) {
               throw new Error("The API did not return a valid schedule. Please try again.");
          }
          
          if (result.schedule.length === 0 && result.diagnostics?.unplacedRuns?.length > 0) {
              const { unplacedRuns, requiredRuns } = result.diagnostics;
              setError(`Could not create a full schedule. ${unplacedRuns.length} of ${requiredRuns} runs could not be placed. Common reason: Not enough compatible arena time slots available.`);
              setStep(ScheduleStep.Error);
              return;
          }

          const batch = writeBatch(db);
          const scheduleCollection = collection(db, `events/${eventId}/schedule`);
          
          // Clear existing schedule
          const scheduleSnapshot = await getDocs(scheduleCollection);
          scheduleSnapshot.forEach(doc => {
              batch.delete(doc.ref);
          });
          
          result.schedule.forEach((run: any) => {
              const docRef = doc(scheduleCollection);
              batch.set(docRef, { ...run, id: docRef.id });
          });

          await batch.commit();

          setStep(ScheduleStep.Complete);
          toast({
              title: "Schedule Generated!",
              description: `A new schedule has been created with ${result.schedule.length} runs.`
          });

      } catch (e: any) {
          console.error("Error generating schedule:", e);
          let errorMessage = e.message || "An unknown error occurred while generating the schedule.";
          if (errorMessage.includes('400')) {
             errorMessage = "The server received a bad request. Please check your data."
          }
          setError(errorMessage);
          setStep(ScheduleStep.Error);
      }
  };
  
  const isReady = arenas.length > 0 && competitors.length > 0 && eventDays.length > 0;

  return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
              <Button disabled={!isReady || step === ScheduleStep.Generating}>
                  {step === ScheduleStep.Generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Generate Schedule
              </Button>
          </DialogTrigger>
          <DialogContent ref={contentRef} tabIndex={-1}>
            <DialogHeader>
              <DialogTitle>Automatic Scheduler</DialogTitle>
              <DialogDescription>
                Automatically generate a valid schedule for your event.
              </DialogDescription>
            </DialogHeader>
            
            {step === ScheduleStep.Idle && (
                <div>
                    <p className="mb-4">The scheduler will attempt to create a valid schedule by assigning all competitors to their required runs based on their specialties, distributing them across the available days and time slots.</p>
                    <p className="text-sm text-muted-foreground">This works best as a starting point. You can always manually adjust the schedule after it's generated.</p>
                </div>
            )}

            {step === ScheduleStep.Confirm && (
                 <div className="flex items-center gap-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0"/>
                    <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Overwrite Existing Schedule?</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            You already have {currentSchedule.length} runs scheduled. Generating a new schedule will remove all of them. This action cannot be undone.
                        </p>
                    </div>
                </div>
            )}
            
            {step === ScheduleStep.Generating && (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 font-medium">Generating schedule...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </div>
            )}
            
            {step === ScheduleStep.Complete && (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FileCheck2 className="mx-auto h-12 w-12 text-green-500" />
                    <p className="mt-4 font-medium">Schedule Generated!</p>
                    <p className="text-sm text-muted-foreground">The new schedule is now visible.</p>
                </div>
            )}
            
             {step === ScheduleStep.Error && (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <p className="mt-4 font-medium">Generation Failed</p>
                    <p className="text-sm text-destructive mt-1 max-w-full break-words p-2">{error}</p>
                </div>
            )}


            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              {(step === ScheduleStep.Idle || step === ScheduleStep.Confirm) && (
                <Button onClick={handleGenerateSchedule}>
                    <Wand2 className="mr-2 h-4 w-4"/>
                    {currentSchedule.length > 0 ? "Overwrite and Generate" : "Generate Schedule"}
                </Button>
              )}
               {(step === ScheduleStep.Complete || step === ScheduleStep.Error) && (
                <Button onClick={handleClose}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
  );
}
