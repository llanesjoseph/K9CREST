
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Loader2, UserPlus } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Checkbox } from './ui/checkbox';
import { useAuth } from './auth-provider';

const specialtySchema = z.object({
  type: z.enum(["Bite Work", "Detection"]),
  detectionType: z.enum(["Narcotics", "Explosives"]).optional(),
});

const competitorSchema = z.object({
  name: z.string().min(1, 'Handler name is required.'),
  dogName: z.string().min(1, 'K9 name is required.'),
  agency: z.string().min(1, 'Agency is required.'),
  specialties: z.array(specialtySchema).optional(),
});

type FormValues = z.infer<typeof competitorSchema>;

const specialtiesOptions = [
    { id: 'biteWork', label: 'Bite Work' },
    { id: 'detectionNarcotics', label: 'Detection (Narcotics)' },
    { id: 'detectionExplosives', label: 'Detection (Explosives)' },
]

export function AddCompetitorDialog({ eventId }: { eventId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      name: '',
      dogName: '',
      agency: '',
      specialties: [],
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!eventId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Event ID is missing.",
        });
        return;
    }
    
    if (authLoading) {
        toast({
            variant: "destructive",
            title: "Please wait",
            description: "Authentication is still loading.",
        });
        return;
    }

    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have permission to add competitors.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
        const competitorsRef = collection(db, `events/${eventId}/competitors`);
        await addDoc(competitorsRef, { ...data, createdAt: new Date() });

        toast({
            title: 'Competitor Added',
            description: `${data.dogName} has been successfully added to the event.`,
        });
        form.reset();
        setIsOpen(false);
    } catch (error) {
        console.error('Error adding competitor:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to add competitor. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Competitor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Competitor</DialogTitle>
          <DialogDescription>
            Manually enter the details for a single competitor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Handler Name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="dogName">K9 Name</Label>
                <Input id="dogName" {...form.register('dogName')} />
                 {form.formState.errors.dogName && <p className="text-sm text-destructive">{form.formState.errors.dogName.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="agency">Agency</Label>
                <Input id="agency" {...form.register('agency')} />
                 {form.formState.errors.agency && <p className="text-sm text-destructive">{form.formState.errors.agency.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Specialties</Label>
                <Controller
                    control={form.control}
                    name="specialties"
                    render={({ field }) => (
                        <div className="space-y-2 rounded-md border p-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="biteWork"
                                    checked={field.value?.some(s => s.type === 'Bite Work')}
                                    onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        const newValue = checked ? [...current, { type: 'Bite Work' }] : current.filter(s => s.type !== 'Bite Work');
                                        field.onChange(newValue);
                                    }}
                                />
                                <Label htmlFor="biteWork" className="font-normal">Bite Work</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="detectionNarcotics"
                                    checked={field.value?.some(s => s.detectionType === 'Narcotics')}
                                     onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        let newValue;
                                        if(checked) {
                                            newValue = [...current.filter(s => s.detectionType !== 'Explosives'), { type: 'Detection', detectionType: 'Narcotics' }];
                                        } else {
                                            newValue = current.filter(s => s.detectionType !== 'Narcotics');
                                        }
                                        field.onChange(newValue);
                                    }}
                                />
                                <Label htmlFor="detectionNarcotics" className="font-normal">Detection (Narcotics)</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="detectionExplosives"
                                    checked={field.value?.some(s => s.detectionType === 'Explosives')}
                                    onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        let newValue;
                                        if(checked) {
                                            newValue = [...current.filter(s => s.detectionType !== 'Narcotics'), { type: 'Detection', detectionType: 'Explosives' }];
                                        } else {
                                            newValue = current.filter(s => s.detectionType !== 'Explosives');
                                        }
                                        field.onChange(newValue);
                                    }}
                                 />
                                <Label htmlFor="detectionExplosives" className="font-normal">Detection (Explosives)</Label>
                            </div>
                        </div>
                    )}
                />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || authLoading}>
                    {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Competitor
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
