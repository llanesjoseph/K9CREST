
"use client";

import { useState, useRef } from 'react';
import { Upload, Loader2, FileCheck2, AlertTriangle, Users, Wand2 } from 'lucide-react';
import { collection, writeBatch } from 'firebase/firestore';

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
import { SidebarMenuButton } from './ui/sidebar';
import { processCompetitorCsv } from '@/ai/flows/process-competitor-csv';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface CompetitorImportDialogProps {
  eventId: string;
}

interface ParsedCompetitor {
    name: string;
    dogName: string;
    agency: string;
}

enum ImportStep {
  SelectFile,
  Processing,
  Confirming,
  Uploading,
  Complete,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.SelectFile);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCompetitor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep(ImportStep.SelectFile);
    setFileName('');
    setParsedData([]);
    setError(null);
    setUploadProgress(0);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetState();
    setFileName(file.name);

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Invalid file type. Please upload a CSV file.');
      setStep(ImportStep.Error);
      return;
    }
    
    setStep(ImportStep.Processing);

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
  };

  const handleImport = async () => {
    if (!eventId || parsedData.length === 0) return;

    setStep(ImportStep.Uploading);
    const batch = writeBatch(db);
    const competitorsRef = collection(db, `events/${eventId}/competitors`);

    try {
      parsedData.forEach((row, index) => {
        const docRef = collection(competitorsRef).doc();
        batch.set(docRef, {
            name: row.name || '',
            dogName: row.dogName || '',
            agency: row.agency || '',
            createdAt: new Date(),
        });
        // This state update can be slow for large lists, but fine for now
        setUploadProgress(((index + 1) / parsedData.length) * 100);
      });

      await batch.commit();
      
      setStep(ImportStep.Complete);
      toast({
        title: 'Import Successful',
        description: `${parsedData.length} competitors have been imported.`,
      });
    } catch (e) {
      console.error('Error importing competitors: ', e);
      setError('An error occurred while saving the data to the database.');
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
          // Reset state when closing the dialog
          setTimeout(resetState, 300);
      }
  }

  const renderContent = () => {
    switch (step) {
      case ImportStep.SelectFile:
        return (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Drag & drop your CSV file here or click to browse.</p>
             <p className="mt-1 text-xs text-muted-foreground flex items-center justify-center gap-1.5"><Wand2 className="h-3 w-3 text-primary" /> AI will automatically map columns.</p>
          </div>
        );
      case ImportStep.Processing:
        return (
            <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-medium">AI is processing your file...</p>
                <p className="text-sm text-muted-foreground">This may take a moment.</p>
            </div>
        )
      case ImportStep.Confirming:
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg mb-4">
              <FileCheck2 className="h-6 w-6 text-green-500 shrink-0" />
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 10).map((c, i) => (
                             <TableRow key={i}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.dogName}</TableCell>
                                <TableCell>{c.agency}</TableCell>
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
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-medium">Importing competitors...</p>
            <Progress value={uploadProgress} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
          </div>
        );
      case ImportStep.Complete:
        return (
           <div className="text-center">
            <FileCheck2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">{parsedData.length} competitors were successfully added.</p>
          </div>
        );
      case ImportStep.Error:
        return (
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-medium">Import Failed</p>
            <p className="text-sm text-destructive mt-1 max-w-full break-words p-2">{error}</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <SidebarMenuButton variant="ghost" className="justify-start w-full" disabled={!eventId} tooltip={{children: "Import Competitors", side: "right"}}>
            <Users className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden">Import Competitors</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Competitors</DialogTitle>
          <DialogDescription>
            Upload a CSV file with competitor data. The AI will attempt to map columns automatically.
          </DialogDescription>
        </DialogHeader>
        <div 
          className="relative flex items-center justify-center w-full flex-grow border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors p-4"
          onClick={() => step !== ImportStep.Processing && step !== ImportStep.Uploading && fileInputRef.current?.click()}
        >
          {renderContent()}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={step === ImportStep.Uploading || step === ImportStep.Processing}
          />
        </div>
        <DialogFooter>
          {step === ImportStep.SelectFile && <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>}
           {step === ImportStep.Processing && <Button variant="outline" disabled>Processing...</Button>}
          {step === ImportStep.Confirming && (
            <>
              <Button variant="outline" onClick={resetState}>Cancel</Button>
              <Button onClick={handleImport}>Import {parsedData.length} Competitors</Button>
            </>
          )}
          {step === ImportStep.Error && <Button variant="outline" onClick={resetState}>Try Again</Button>}
          {step === ImportStep.Complete && <Button onClick={() => setIsOpen(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    