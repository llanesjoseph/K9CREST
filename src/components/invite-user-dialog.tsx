
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  role: z.enum(['judge', 'competitor', 'spectator', 'admin'], {
      required_error: "You must select a role for the user."
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
    triggerAsLink?: boolean;
}

export function InviteUserDialog({ triggerAsLink = false }: InviteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
        // TODO: Call Genkit flow to create user and send invite email.
        console.log("Inviting user:", data);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

        toast({
            title: 'User Invited',
            description: `An invitation has been sent to ${data.email}.`,
        });
        
        form.reset();
        setIsOpen(false);
    } catch (error) {
        console.error('Error inviting user:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to invite user. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const Trigger = triggerAsLink ? (
      <Button variant="link" className="p-0 h-auto">Invite one now</Button>
  ) : (
      <Button>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite User
      </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Enter the user's email and assign a role. They will receive an email to set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" {...form.register('email')} placeholder="name@example.com" />
                {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => form.setValue('role', value as any)} defaultValue="">
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="judge">Judge</SelectItem>
                        <SelectItem value="competitor">Competitor</SelectItem>
                        <SelectItem value="spectator">Spectator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                {form.formState.errors.role && <p className="text-sm text-destructive mt-1">{form.formState.errors.role.message}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invitation
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
