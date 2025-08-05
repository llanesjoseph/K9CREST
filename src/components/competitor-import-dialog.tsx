
"use client";

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Loader2, FileCheck2, AlertTriangle, Users } from 'lucide-react';
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

interface CompetitorImportDialogProps {
  eventId: string;
}

enum ImportStep {
  SelectFile,
  Confirming,
  Uploading,
  Complete,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.SelectFile);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
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

    if (file.type !== 'text/csv') {
      setError('Invalid file type. Please upload a CSV file.');
      setStep(ImportStep.Error);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          setStep(ImportStep.Error);
          return;
        }
        
        const requiredHeaders = ['name', 'dogName', 'agency'];
        const headers = Object.keys(results.data[0] || {});
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if(missingHeaders.length > 0) {
            setError(`Missing required columns in CSV: ${missingHeaders.join(', ')}. The header must be lowercase.`);
            setStep(ImportStep.Error);
            return;
        }

        setParsedData(results.data);
        setStep(ImportStep.Confirming);
      },
      error: () => {
        setError('Failed to parse the CSV file.');
        setStep(ImportStep.Error);
      },
    });
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
            <p className="mt-1 text-xs text-muted-foreground">Required columns: name, dogName, agency</p>
          </div>
        );
      case ImportStep.Confirming:
        return (
          <div>
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <FileCheck2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  Found {parsedData.length} competitors. Ready to import.
                </p>
              </div>
            </div>
            {/* You could show a preview of the data here if desired */}
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
            <p className="text-sm text-destructive mt-1">{error}</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" /> Import Competitors
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Competitors</DialogTitle>
          <DialogDescription>
            Upload a CSV file with competitor data. The file must contain 'name', 'dogName', and 'agency' columns.
          </DialogDescription>
        </DialogHeader>
        <div 
          className="relative flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {renderContent()}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={step === ImportStep.Uploading}
          />
        </div>
        <DialogFooter>
          {step === ImportStep.SelectFile && <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>}
          {step === ImportStep.Confirming && (
            <>
              <Button variant="outline" onClick={resetState}>Choose another file</Button>
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
