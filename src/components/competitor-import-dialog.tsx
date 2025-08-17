
"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
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
import type { Specialty } from '@/lib/schedule-types';

interface CompetitorImportDialogProps {
  eventId: string;
}

type ParsedCompetitor = {
    name: string;
    dogName: string;
    agency: string;
    specialties: Specialty[];
}

enum ImportStep {
  Upload,
  Confirm,
  Importing,
  Complete,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.Upload);
  const [parsedData, setParsedData] = useState<ParsedCompetitor[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if(!open) {
          // Reset state when closing
          setTimeout(() => {
              setStep(ImportStep.Upload);
              setParsedData([]);
              setFileName(null);
              setError(null);
              setIsImporting(false);
          }, 300);
      }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const requiredHeaders = ['name', 'dogName', 'agency'];
          const actualHeaders = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

          if (missingHeaders.length > 0) {
            setError(`CSV file is missing required columns: ${missingHeaders.join(', ')}.`);
            setStep(ImportStep.Error);
            return;
          }

          const data = (results.data as any[]).map(row => {
            const specialties: Specialty[] = [];
            if(row.specialty_bite_work?.toLowerCase() === 'true') {
                specialties.push({ type: "Bite Work" });
            }
            if(row.specialty_detection_narcotics?.toLowerCase() === 'true') {
                specialties.push({ type: "Detection", detectionType: "Narcotics" });
            }
            if(row.specialty_detection_explosives?.toLowerCase() === 'true') {
                specialties.push({ type: "Detection", detectionType: "Explosives" });
            }

            return {
                name: row.name,
                dogName: row.dogName,
                agency: row.agency,
                specialties: specialties,
            }
          });
          setParsedData(data);
          setStep(ImportStep.Confirm);
        },
        error: (err: any) => {
            setError(err.message);
            setStep(ImportStep.Error);
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleImport = async () => {
    if (!isAdmin || !eventId) return;
    setIsImporting(true);
    try {
        const batch = writeBatch(db);
        const competitorsRef = collection(db, `events/${eventId}/competitors`);

        parsedData.forEach(competitor => {
            const newCompetitorRef = doc(competitorsRef);
            batch.set(newCompetitorRef, competitor);
        });

        await batch.commit();

        setStep(ImportStep.Complete);
        toast({
            title: "Import Successful",
            description: `${parsedData.length} competitors have been added to the event.`
        });

    } catch (err: any) {
        setError(err.message);
        setStep(ImportStep.Error);
    } finally {
        setIsImporting(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case ImportStep.Upload:
        return (
          <div {...getRootProps()} className={cn("flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-lg cursor-pointer", isDragActive && "border-primary bg-primary/10")}>
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">
              {isDragActive ? "Drop the file here" : "Drag & drop a CSV file here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground">Required columns: name, dogName, agency</p>
             <p className="text-xs text-muted-foreground mt-2">Optional columns for specialties: specialty_bite_work, specialty_detection_narcotics, specialty_detection_explosives (set value to TRUE)</p>
          </div>
        );
      case ImportStep.Confirm:
        return (
          <>
            <div className="flex items-center gap-2 p-2 mb-4 bg-muted rounded-md">
              <FileText className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium truncate flex-grow">{fileName}</p>
              <p className="text-sm text-muted-foreground shrink-0">{parsedData.length} records found</p>
            </div>
             <div className="h-full overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                            <TableHead>Handler</TableHead>
                            <TableHead>K9</TableHead>
                            <TableHead>Agency</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.dogName}</TableCell>
                                <TableCell>{row.agency}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </>
        );
       case ImportStep.Importing:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Importing Data...</p>
            <p className="text-sm text-muted-foreground">Please wait while we add the competitors.</p>
          </div>
        );
      case ImportStep.Complete:
        return (
           <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <p className="mt-4 font-medium">Import Complete</p>
            <p className="text-sm text-muted-foreground">{parsedData.length} competitors were successfully imported.</p>
          </div>
        );
      case ImportStep.Error:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-medium">Import Failed</p>
            <p className="text-sm text-destructive mt-1 max-w-full break-words p-2 bg-destructive/10 rounded-md">{error}</p>
          </div>
        );
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
                Upload a CSV file to add multiple competitors to the event at once.
            </DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-4 overflow-hidden">
            {renderContent()}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {step === ImportStep.Complete ? 'Close' : 'Cancel'}
            </Button>
            {step === ImportStep.Confirm && (
                <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm & Import
                </Button>
            )}
            {step === ImportStep.Error && (
                 <Button onClick={() => setStep(ImportStep.Upload)}>Try Again</Button>
            )}
        </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
