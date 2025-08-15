
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


interface AiScheduleDialogProps {
  eventId: string;
  arenas: Arena[];
  competitors: Competitor[];
  eventDays: Date[];
  currentSchedule: ScheduledEvent[];
}

enum ScheduleStep {
  Idle,
  Error,
}



export function AiScheduleDialog({ eventId, arenas, competitors, eventDays, currentSchedule }: AiScheduleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ScheduleStep>(ScheduleStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if(isOpen) {
        setError("The AI scheduling feature is temporarily disabled due to ongoing maintenance. Please use manual scheduling.");
        setStep(ScheduleStep.Error);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          setTimeout(() => {
            setStep(ScheduleStep.Idle);
            setError(null);
          }, 300);
      }
  }

  const handleClose = () => {
    handleOpenChange(false);
  };
  
  const isReady = arenas.length > 0 && competitors.length > 0 && eventDays.length > 0;

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
                This feature is currently undergoing maintenance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center h-32 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <p className="mt-4 font-medium">Feature Unavailable</p>
                <p className="text-sm text-destructive mt-1 max-w-full break-words p-2">{error}</p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
  );
}
