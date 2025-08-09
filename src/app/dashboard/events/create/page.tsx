
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Upload, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { db } from "@/lib/firebase";

const formSchema = z.object({
  eventName: z.string().min(2, "Event name must be at least 2 characters."),
  date: z.object({
    from: z.date({
      required_error: "A start date is required.",
    }),
    to: z.date().optional(),
  }),
  location: z.string().min(2, "Location is required."),
  description: z.string().optional(),
  bannerImage: z.any().optional(),
  scheduleBlockDuration: z.coerce.number().default(30),
  lunchBreakStart: z.string().optional(),
  lunchBreakEnd: z.string().optional(),
}).refine(data => {
    if (data.lunchBreakStart && !data.lunchBreakEnd) return false;
    if (!data.lunchBreakStart && data.lunchBreakEnd) return false;
    return true;
}, {
    message: "Both lunch break start and end times are required.",
    path: ['lunchBreakEnd'],
});

export default function CreateEventPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: "",
      location: "",
      description: "",
      scheduleBlockDuration: 30,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // TODO: Handle banner image upload to Firebase Storage
      const eventData = {
        name: values.eventName,
        startDate: values.date.from,
        endDate: values.date.to,
        location: values.location,
        description: values.description,
        scheduleBlockDuration: values.scheduleBlockDuration,
        lunchBreak: (values.lunchBreakStart && values.lunchBreakEnd) 
            ? { start: values.lunchBreakStart, end: values.lunchBreakEnd }
            : null,
        status: "Upcoming", // Default status
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "events"), eventData);
      console.log("Document written with ID: ", docRef.id);

      toast({
        title: "Event Created!",
        description: `${values.eventName} has been successfully created.`,
      });
      router.push("/dashboard/events");
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error creating the event. Please try again.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
        <CardDescription>
          Fill out the details below to set up a new K9 trial event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <FormField
                  control={form.control}
                  name="eventName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Spring National Trial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Event Dates</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value?.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (
                                field.value.to ? (
                                  <>
                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                    {format(field.value.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(field.value.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={2}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="scheduleBlockDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Block Duration</FormLabel>
                       <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                         <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a duration" />
                          </SelectTrigger>
                         </FormControl>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="20">20 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-8 flex flex-col">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex-grow flex flex-col">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a brief description of the event."
                          className="resize-none flex-grow"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                    <FormLabel>Lunch Break (Optional)</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="lunchBreakStart"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input type="time" {...field} />
                                    </FormControl>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">Start Time</FormLabel>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lunchBreakEnd"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input type="time" {...field} />
                                    </FormControl>
                                     <FormLabel className="text-xs text-muted-foreground font-normal">End Time</FormLabel>
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormMessage />
                </div>
                 <FormField
                    control={form.control}
                    name="bannerImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banner Image</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href="/dashboard/events">Cancel</Link></Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
