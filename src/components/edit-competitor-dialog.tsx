
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Edit } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

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
import { Competitor } from '@/lib/schedule-types';

const formSchema = z.object({
  bibNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCompetitorDialogProps {
    eventId: string;
    competitor: Competitor;
}

export function EditCompetitorDialog({ eventId, competitor }: EditCompetitorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { bibNumber: competitor.bibNumber || '' },
  });

  const onSubmit = async (data: FormValues) => {
    if (!eventId) {
        toast({ variant: "destructive", title: "Error", description: "Event ID is missing." });
        return;
    }
    setIsSubmitting(true);
    try {
        const competitorRef = doc(db, `events/${eventId}/competitors`, competitor.id);
        await updateDoc(competitorRef, {
            bibNumber: data.bibNumber || null
        });
        
        toast({
            title: 'Competitor Updated',
            description: `BIB number for ${competitor.dogName} has been updated.`,
        });
        
        setIsOpen(false);
    } catch (error) {
        console.error('Error updating competitor:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update competitor. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit Competitor</span>
          </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Competitor: {competitor.dogName}</DialogTitle>
          <DialogDescription>
            Modify the BIB number for this competitor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="bibNumber">BIB Number</Label>
                <Input id="bibNumber" {...form.register('bibNumber')} placeholder="e.g., 101" />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
