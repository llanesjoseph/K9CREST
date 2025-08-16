
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Arena } from '@/lib/schedule-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formSchema = z.object({
  rubricId: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditArenaDialogProps {
    eventId: string;
    arena: Arena;
    rubrics: { id: string; name: string }[];
}

export function EditArenaDialog({ eventId, arena, rubrics }: EditArenaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { rubricId: arena.rubricId || null },
  });

  const onSubmit = async (data: FormValues) => {
    if (!eventId) {
        toast({ variant: "destructive", title: "Error", description: "Event ID is missing." });
        return;
    }
    setIsSubmitting(true);
    try {
        const arenaRef = doc(db, `events/${eventId}/arenas`, arena.id);
        await updateDoc(arenaRef, {
            rubricId: data.rubricId
        });
        
        toast({
            title: 'Arena Updated',
            description: `Rubric for ${arena.name} has been updated.`,
        });
        
        setIsOpen(false);
    } catch (error) {
        console.error('Error updating arena:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update arena. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-4 w-4 ml-1">
            <Edit className="h-3 w-3" />
            <span className="sr-only">Edit Rubric</span>
          </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Arena: {arena.name}</DialogTitle>
          <DialogDescription>
            Change the scoring rubric assigned to this arena.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="rubricId">Assigned Rubric</Label>
                <Controller
                    control={form.control}
                    name="rubricId"
                    render={({ field }) => (
                         <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                            value={field.value || "none"}
                         >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a rubric" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Rubric</SelectItem>
                                {rubrics.map((rubric) => (
                                    <SelectItem key={rubric.id} value={rubric.id}>
                                        {rubric.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
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
