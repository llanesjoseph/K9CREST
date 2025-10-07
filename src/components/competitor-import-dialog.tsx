
"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Loader2, Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Info } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import type { Specialty } from '@/lib/schedule-types';
import {
  autoDetectColumns,
  validateMapping,
  getFieldLabel,
  extractValue,
  type FieldMapping,
} from '@/lib/smart-csv-parser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  MapColumns,
  Confirm,
  Importing,
  Complete,
  Error,
}

export function CompetitorImportDialog({ eventId }: CompetitorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>(ImportStep.Upload);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({
    name: null,
    dogName: null,
    agency: null,
    specialty_bite_work: null,
    specialty_detection_narcotics: null,
    specialty_detection_explosives: null,
  });
  const [autoConfidence, setAutoConfidence] = useState<{ [key: string]: number }>({});
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
              setRawData([]);
              setHeaders([]);
              setMapping({
                name: null,
                dogName: null,
                agency: null,
                specialty_bite_work: null,
                specialty_detection_narcotics: null,
                specialty_detection_explosives: null,
              });
              setAutoConfidence({});
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

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Handle JSON files
      if (fileExtension === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonContent = JSON.parse(e.target?.result as string);

            // Handle both array and object with array property
            let jsonData: any[] = [];
            if (Array.isArray(jsonContent)) {
              jsonData = jsonContent;
            } else if (jsonContent.data && Array.isArray(jsonContent.data)) {
              jsonData = jsonContent.data;
            } else if (jsonContent.competitors && Array.isArray(jsonContent.competitors)) {
              jsonData = jsonContent.competitors;
            } else {
              // Try to find first array property
              const firstArrayKey = Object.keys(jsonContent).find(key => Array.isArray(jsonContent[key]));
              if (firstArrayKey) {
                jsonData = jsonContent[firstArrayKey];
              } else {
                setError('JSON file must contain an array of records or have a data/competitors array property.');
                setStep(ImportStep.Error);
                return;
              }
            }

            if (jsonData.length === 0) {
              setError('JSON file contains no records.');
              setStep(ImportStep.Error);
              return;
            }

            // Extract headers from first object
            const jsonHeaders = Object.keys(jsonData[0]);
            setHeaders(jsonHeaders);
            setRawData(jsonData);

            // Auto-detect column mapping
            const { mapping: detectedMapping, confidence } = autoDetectColumns(jsonHeaders);
            setMapping(detectedMapping);
            setAutoConfidence(confidence);

            // Check if we have high confidence for required fields
            const validation = validateMapping(detectedMapping);

            if (validation.valid && confidence.name > 0.8 && confidence.dogName > 0.8 && confidence.agency > 0.8) {
              // High confidence - skip to confirm
              processDataWithMapping(jsonData, detectedMapping);
              setStep(ImportStep.Confirm);
            } else {
              // Show mapping UI for user review
              setStep(ImportStep.MapColumns);
            }
          } catch (err: any) {
            setError(`Failed to parse JSON: ${err.message}`);
            setStep(ImportStep.Error);
          }
        };
        reader.onerror = () => {
          setError('Failed to read JSON file');
          setStep(ImportStep.Error);
        };
        reader.readAsText(file);
        return;
      }

      // Handle CSV files (default)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const csvHeaders = results.meta.fields || [];

          if (csvHeaders.length === 0) {
            setError('CSV file has no columns. Please check your file format.');
            setStep(ImportStep.Error);
            return;
          }

          setHeaders(csvHeaders);
          setRawData(results.data as any[]);

          // Auto-detect column mapping
          const { mapping: detectedMapping, confidence } = autoDetectColumns(csvHeaders);
          setMapping(detectedMapping);
          setAutoConfidence(confidence);

          // Check if we have high confidence for required fields
          const validation = validateMapping(detectedMapping);

          if (validation.valid && confidence.name > 0.8 && confidence.dogName > 0.8 && confidence.agency > 0.8) {
            // High confidence - skip to confirm
            processDataWithMapping(results.data as any[], detectedMapping);
            setStep(ImportStep.Confirm);
          } else {
            // Show mapping UI for user review
            setStep(ImportStep.MapColumns);
          }
        },
        error: (err: any) => {
            setError(err.message);
            setStep(ImportStep.Error);
        }
      });
    }
  }, []);

  const processDataWithMapping = (data: any[], currentMapping: FieldMapping) => {
    const processed = data.map(row => {
      const specialties: Specialty[] = [];

      if (extractValue(row, currentMapping, 'specialty_bite_work')) {
        specialties.push({ type: "Bite Work" });
      }
      if (extractValue(row, currentMapping, 'specialty_detection_narcotics')) {
        specialties.push({ type: "Detection", detectionType: "Narcotics" });
      }
      if (extractValue(row, currentMapping, 'specialty_detection_explosives')) {
        specialties.push({ type: "Detection", detectionType: "Explosives" });
      }

      return {
        name: extractValue(row, currentMapping, 'name') as string || '',
        dogName: extractValue(row, currentMapping, 'dogName') as string || '',
        agency: extractValue(row, currentMapping, 'agency') as string || '',
        specialties,
      };
    });

    setParsedData(processed);
  };

  const handleConfirmMapping = () => {
    const validation = validateMapping(mapping);

    if (!validation.valid) {
      setError(`Please map the following required fields: ${validation.missing.map(f => getFieldLabel(f)).join(', ')}`);
      return;
    }

    processDataWithMapping(rawData, mapping);
    setStep(ImportStep.Confirm);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
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
          <div {...getRootProps()} className={cn("flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-lg cursor-pointer p-8", isDragActive && "border-primary bg-primary/10")}>
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">
              {isDragActive ? "Drop the file here" : "Drag & drop a CSV or JSON file here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">The importer will automatically detect your file format and column structure</p>
            <div className="mt-4 p-3 bg-muted rounded-md text-left max-w-md">
              <p className="text-xs font-medium mb-1">Supported columns:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Handler/Officer name (required)</li>
                <li>• K9/Dog name (required)</li>
                <li>• Agency/Department (required)</li>
                <li>• Bite Work specialty (optional)</li>
                <li>• Narcotics Detection (optional)</li>
                <li>• Explosives Detection (optional)</li>
              </ul>
            </div>
          </div>
        );

      case ImportStep.MapColumns:
        return (
          <div className="h-full overflow-y-auto space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Review the detected column mappings below. The system has automatically matched your CSV columns to the required fields.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {Object.keys(mapping).map((field) => {
                const isRequired = ['name', 'dogName', 'agency'].includes(field);
                const confidence = autoConfidence[field] || 0;
                const currentValue = mapping[field as keyof FieldMapping];

                return (
                  <div key={field} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{getFieldLabel(field)}</p>
                        {isRequired && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Required</span>
                        )}
                        {confidence > 0 && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            confidence > 0.8 ? "bg-green-100 text-green-700" :
                            confidence > 0.5 ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {Math.round(confidence * 100)}% match
                          </span>
                        )}
                      </div>
                      <Select
                        value={currentValue || undefined}
                        onValueChange={(value) => setMapping({ ...mapping, [field]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- None --</SelectItem>
                          {headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
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
                            <TableHead>Specialties</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 50).map((row, i) => (
                            <TableRow key={i}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.dogName}</TableCell>
                                <TableCell>{row.agency}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {row.specialties.map((s, idx) => (
                                      <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        {s.type === 'Detection' ? `${s.detectionType}` : s.type}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {parsedData.length > 50 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    Showing first 50 of {parsedData.length} records
                  </div>
                )}
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
        <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>Smart Bulk Import</DialogTitle>
            <DialogDescription>
                Upload a CSV or JSON file - we&apos;ll automatically detect the format and column structure
            </DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-4 overflow-hidden">
            {renderContent()}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {step === ImportStep.Complete ? 'Close' : 'Cancel'}
            </Button>
            {step === ImportStep.MapColumns && (
                <Button onClick={handleConfirmMapping}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Preview
                </Button>
            )}
            {step === ImportStep.Confirm && (
                <Button onClick={handleImport} disabled={isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm & Import {parsedData.length} Records
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
