
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

const rubricSchema = z.object({
  name: z.string().min(1, 'Rubric name is required.'),
});

type FormValues = z.infer<typeof rubricSchema>;

interface AssignRubricDialogProps {
    children: React.ReactNode;
    onRubricCreated: (id: string) => void;
}

export function AssignRubricDialog({ children, onRubricCreated }: AssignRubricDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(rubricSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
        const newRubric = {
            ...data,
            createdBy: 'admin', // placeholder
            createdAt: serverTimestamp(),
            phases: [] // Initialize with empty phases
        };
        
        const docRef = await addDoc(collection(db, `rubrics`), newRubric);
        
        toast({
            title: 'Rubric Created',
            description: `${data.name} has been successfully created and added to the global library.`,
        });
        
        onRubricCreated(docRef.id);
        form.reset();
        setIsOpen(false);
    } catch (error) {
        console.error('Error creating rubric:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to create rubric. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Global Rubric</DialogTitle>
          <DialogDescription>
            This rubric will be saved to your library and can be reused across multiple events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Rubric Name</Label>
                <Input id="name" {...form.register('name')} placeholder="e.g., Obedience Trial Rubric" />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create and Assign
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
