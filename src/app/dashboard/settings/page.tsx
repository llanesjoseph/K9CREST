
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload } from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, documentId } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { Competitor } from '@/lib/schedule-types';

const profileSchema = z.object({
  handlerName: z.string().min(1, 'Handler name is required.'),
  dogName: z.string().min(1, 'K9 name is required.'),
  dogBio: z.string().optional(),
  dogImage: z.any().optional(),
});

type FormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [competitorId, setCompetitorId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      handlerName: user?.displayName || '',
      dogName: '',
      dogBio: '',
    },
  });

  useEffect(() => {
    const fetchCompetitorData = async () => {
      if (!user?.uid || !user.displayName) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      try {
        const eventsRef = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsRef);
        let foundCompetitor: Competitor | null = null;
        
        for (const eventDoc of eventsSnapshot.docs) {
           const competitorsRef = collection(db, `events/${eventDoc.id}/competitors`);
           const q = query(competitorsRef, where("name", "==", user.displayName));
           const competitorSnapshot = await getDocs(q);
           if (!competitorSnapshot.empty) {
               const competitorDoc = competitorSnapshot.docs[0];
               foundCompetitor = { id: competitorDoc.id, ...competitorDoc.data() } as Competitor;
               break; 
           }
        }

        if (foundCompetitor) {
          setCompetitorId(foundCompetitor.id);
          form.reset({
            handlerName: foundCompetitor.name || user?.displayName || '',
            dogName: foundCompetitor.dogName || '',
            dogBio: foundCompetitor.dogBio || '',
          });
          if(foundCompetitor.dogImage) {
            setImageUrl(foundCompetitor.dogImage);
          }
        } else {
            form.reset({
                handlerName: user?.displayName || '',
                dogName: '',
                dogBio: '',
            });
        }
      } catch (error) {
        console.error("Error fetching competitor data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your profile data.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchCompetitorData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading, form, toast]);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    setIsSubmitting(true);
    
    try {
      let newImageUrl = imageUrl;
      if (data.dogImage && data.dogImage[0]) {
        const file = data.dogImage[0];
        const storageRef = ref(storage, `k9_images/${user.uid}/${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        newImageUrl = await getDownloadURL(uploadResult.ref);
        setImageUrl(newImageUrl);
      }

      const batch = writeBatch(db);
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);

      for (const eventDoc of eventsSnapshot.docs) {
          const competitorsRef = collection(db, `events/${eventDoc.id}/competitors`);
          const q = query(competitorsRef, where("name", "==", user.displayName)); 
          const competitorDocs = await getDocs(q);

          competitorDocs.forEach(competitorDoc => {
               batch.update(competitorDoc.ref, {
                  name: data.handlerName,
                  dogName: data.dogName,
                  dogBio: data.dogBio || null,
                  dogImage: newImageUrl || null,
               });
          });
      }
      
      await batch.commit();

      toast({ title: "Profile Updated", description: "Your K9's profile has been successfully updated across all events." });
      form.reset(data, { keepValues: true });

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if(isLoading || authLoading) {
      return (
          <div className="flex flex-col gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Competitor Profile</CardTitle>
                      <CardDescription>Manage your and your K9's information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1 flex flex-col items-center gap-4">
                             <Skeleton className="h-48 w-48 rounded-full" />
                          </div>
                          <div className="md:col-span-2 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                  <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                              </div>
                               <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-24 w-full" /></div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Competitor Profile</CardTitle>
                <CardDescription>
                    Manage your and your K9&apos;s information. This will be updated across all events.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 flex flex-col items-center gap-4">
                                <Controller
                                    control={form.control}
                                    name="dogImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label htmlFor="dogImage">
                                                <div className="relative group w-48 h-48 cursor-pointer">
                                                     <Image
                                                        src={imageUrl || "https://placehold.co/192x192.png"}
                                                        alt="K9 Photo"
                                                        width={192}
                                                        height={192}
                                                        className="rounded-full object-cover w-48 h-48 border-4 border-muted"
                                                        data-ai-hint="dog pet"
                                                    />
                                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="h-8 w-8 text-white" />
                                                    </div>
                                                </div>
                                            </Label>
                                            <FormControl>
                                                <Input 
                                                    id="dogImage"
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        field.onChange(e.target.files);
                                                        if(e.target.files?.[0]) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setImageUrl(reader.result as string);
                                                            }
                                                            reader.readAsDataURL(e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                 <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="handlerName"
                                        render={({ field }) => (
                                            <FormItem>
                                            <Label>Handler Name</Label>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="dogName"
                                        render={({ field }) => (
                                            <FormItem>
                                            <Label>K9 Name</Label>
                                             <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 </div>
                                 <FormField
                                    control={form.control}
                                    name="dogBio"
                                    render={({ field }) => (
                                        <FormItem>
                                        <Label>K9 Bio</Label>
                                         <FormControl>
                                            <Textarea {...field} placeholder="Tell us about your K9..." className="min-h-[120px]" />
                                         </FormControl>
                                         <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                         <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}

    