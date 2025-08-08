
"use client";

import { useState, useCallback } from 'react';
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
import { processCompetitorCsv, ProcessCompetitorCsvOutput } from '@/ai/flows/process-competitor-csv';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

interface CompetitorImportDialogProps {
  eventId: string;
}

type ParsedCompetitor = ProcessCompetitorCsvOutput['competitors'][0];

enum ImportStep {
  Idle,
  Processing,
  Confirming,
  Uploading,
  Complete,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.Idle);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCompetitor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();

  const resetState = () => {
    setStep(ImportStep.Idle);
    setFileName('');
    setParsedData([]);
    setError(null);
    setUploadProgress(0);
  };
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Invalid file type. Please upload a CSV file.');
      setStep(ImportStep.Error);
      return;
    }
    
    setStep(ImportStep.Processing);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        if (!csvData) {
            setError('Could not read file content.');
            setStep(ImportStep.Error);
            return;
        }

        try {
            const result = await processCompetitorCsv({ csvData });
            if (!result || !result.competitors || result.competitors.length === 0) {
                 setError('The AI could not identify any competitor data in the file. Please check the file content and column headers.');
                 setStep(ImportStep.Error);
                 return;
            }
            setParsedData(result.competitors);
            setStep(ImportStep.Confirming);

        } catch (aiError: any) {
            console.error("AI processing error:", aiError);
            setError(`An AI error occurred while processing the file: ${aiError.message || 'Unknown error'}. Please ensure the file is a valid CSV.`);
            setStep(ImportStep.Error);
        }
    };
    reader.onerror = () => {
        setError('Failed to read the file.');
        setStep(ImportStep.Error);
    }
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: false,
      accept: { 'text/csv': ['.csv'] }
  });


  const handleImport = async () => {
    if (authLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'Authentication is still loading.' });
      return;
    }
    
    if (!isAdmin) {
      const msg = "Permission denied. You do not have access to import competitors for this event.";
      setError(msg);
      setStep(ImportStep.Error);
      toast({ variant: 'destructive', title: 'Import Failed', description: msg });
      return;
    }

    if (!eventId || parsedData.length === 0) return;
    
    setStep(ImportStep.Uploading);
    const batch = writeBatch(db);
    

    try {
      parsedData.forEach((row, index) => {
        const competitorsRef = collection(db, `events/${eventId}/competitors`);
        const docRef = doc(competitorsRef); // Creates a new doc with a random ID
        batch.set(docRef, {
            name: row.name || '',
            dogName: row.dogName || '',
            agency: row.agency || '',
            specialties: row.specialties || [],
            createdAt: new Date(),
        });
        setUploadProgress(((index + 1) / parsedData.length) * 100);
      });

      await batch.commit();
      
      setStep(ImportStep.Complete);
      toast({
        title: 'Import Successful',
        description: `${parsedData.length} competitors have been imported.`,
      });
    } catch (e: any) {
      console.error('Error importing competitors: ', e);
      
      let errorMessage = 'An error occurred while saving the data to the database.';
      if (e.code === 'permission-denied') {
        errorMessage = 'Permission denied. You do not have access to import competitors for this event.';
      }
      
      setError(errorMessage);
      setStep(ImportStep.Error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Could not save competitor data. Please try again.',
      });
    }
  };
  
  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if(!open) {
          setTimeout(resetState, 300);
      }
  }
  
  const getSpecialtyDisplay = (specialties: ParsedCompetitor['specialties'] = []) => {
    if (!specialties || specialties.length === 0) {
        return "N/A";
    }
    return specialties.map(s => {
        if (s.type === 'Detection' && s.detectionType) {
            return `${s.type} (${s.detectionType})`;
        }
        return s.type;
    }).join(', ');
  };


  const renderContent = () => {
    switch (step) {
      case ImportStep.Processing:
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-medium">AI is processing your file...</p>
                <p className="text-sm text-muted-foreground">This may take a moment.</p>
            </div>
        )
      case ImportStep.Confirming:
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg mb-4">
              <FileText className="h-6 w-6 text-primary shrink-0" />
              <div>
                <p className="font-medium truncate">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  Found {parsedData.length} competitors. Ready to import.
                </p>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                            <TableHead>Handler</TableHead>
                            <TableHead>K9 Name</TableHead>
                            <TableHead>Agency</TableHead>
                            <TableHead>Specialties</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 10).map((c, i) => (
                             <TableRow key={i}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.dogName}</TableCell>
                                <TableCell>{c.agency}</TableCell>
                                <TableCell>{getSpecialtyDisplay(c.specialties)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {parsedData.length > 10 && <p className="text-center text-muted-foreground mt-2 text-sm">...and {parsedData.length - 10} more rows.</p>}
          </div>
        );
      case ImportStep.Uploading:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Importing competitors...</p>
            <Progress value={uploadProgress} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
          </div>
        );
      case ImportStep.Complete:
        return (
           <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">{parsedData.length} competitors were successfully added.</p>
          </div>
        );
      case ImportStep.Error:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-medium">Import Failed</p>
            <p className="text-sm text-destructive mt-1 max-w-full break-words p-2">{error}</p>
          </div>
        );
      case ImportStep.Idle:
          return (
            <div {...getRootProps()} className={cn("flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/10" : "hover:border-primary/50")}>
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">{isDragActive ? 'Drop the file here!' : 'Drag & drop your CSV file here'}</p>
                <p className="text-sm text-muted-foreground">or click to browse.</p>
                <p className="text-xs text-muted-foreground mt-4">AI will automatically map columns.</p>
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
            {step === ImportStep.Confirming 
                ? "Review the data parsed by the AI. If it looks correct, proceed with the import."
                : "Upload a CSV file with competitor data. The AI will attempt to map columns automatically."
            }
            </DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-4 overflow-hidden">
            {renderContent()}
        </div>
        <DialogFooter>
            {[ImportStep.Processing, ImportStep.Uploading].includes(step) && <Button variant="outline" disabled>Processing...</Button>}
            {step === ImportStep.Idle && <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>}
            {step === ImportStep.Confirming && (
            <>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={authLoading}>
                  {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {parsedData.length} Competitors
                </Button>
            </>
            )}
            {step === ImportStep.Error && <Button variant="outline" onClick={resetState}>Try Again</Button>}
            {step === ImportStep.Complete && <Button onClick={() => setIsOpen(false)}>Done</Button>}
        </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

    