
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { writeBatch, collection, doc } from 'firebase/firestore';

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
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

interface CompetitorImportDialogProps {
  eventId: string;
}

type ParsedCompetitor = {
    name: string;
    dogName: string;
    agency: string;
    specialties: any[];
}

enum ImportStep {
  Idle,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.Idle);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  useEffect(() => {
    if(isOpen) {
        setError("The competitor import feature is temporarily disabled due to ongoing maintenance. Please add competitors manually.");
        setStep(ImportStep.Error);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if(!open) {
          setTimeout(() => {
              setStep(ImportStep.Idle);
              setError(null);
          }, 300);
      }
  }

  const renderContent = () => {
    switch (step) {
      case ImportStep.Error:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-medium">Feature Unavailable</p>
            <p className="text-sm text-destructive mt-1 max-w-full break-words p-2">{error}</p>
          </div>
        );
      case ImportStep.Idle:
          return (
            <div className={cn("flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-lg")}>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">Feature disabled</p>
                <p className="text-sm text-muted-foreground">The bulk import is temporarily unavailable.</p>
            </div>
          )
      default:
        return null;
    }
  };
  
  if (!isAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
             <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>Bulk Import Competitors</DialogTitle>
            <DialogDescription>
                This feature is temporarily disabled.
            </DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-4 overflow-hidden">
            {renderContent()}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
