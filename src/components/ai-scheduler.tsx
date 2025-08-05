"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { suggestSchedule, type SuggestScheduleInput } from "@/ai/flows/suggest-schedule";

const formSchema = z.object({
  competitorDetails: z.string().min(10, "Please provide more details about competitors."),
  taskDurations: z.string().min(10, "Please provide more details about task durations."),
  timezone: z.string().min(3, "A valid timezone is required."),
  arenaAvailability: z.string().min(10, "Please provide more details about arena availability."),
});

export function AIScheduler() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleProposal, setScheduleProposal] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      competitorDetails: "10 competitors: 5 in obedience, 5 in protection. Some competitors are in both.",
      taskDurations: "Obedience: 10 mins per competitor. Protection: 15 mins per competitor.",
      timezone: "America/New_York",
      arenaAvailability: "Arena 1 (Obedience): 9 AM - 5 PM. Arena 2 (Protection): 10 AM - 4 PM. Lunch break from 12 PM to 1 PM for all.",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setScheduleProposal("");
    try {
      const result = await suggestSchedule(values as SuggestScheduleInput);
      setScheduleProposal(result.scheduleProposal);
      toast({
        title: "Schedule Proposal Generated!",
        description: "The AI has created an initial schedule for you to review.",
      });
    } catch (error) {
      console.error("AI Schedule generation failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate AI schedule. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wand2 className="mr-2 h-4 w-4" />
          Suggest with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>AI Scheduling Assistant</DialogTitle>
          <DialogDescription>
            Provide the details below and let AI propose an initial schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="competitorDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competitor Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., names and specialties" {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taskDurations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Durations</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Obedience: 10 mins" {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="arenaAvailability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arena Availability</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Arena 1: 9am-5pm" {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., America/New_York" {...field} rows={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Proposal"
                )}
              </Button>
            </form>
          </Form>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Schedule Proposal</h3>
            <div className="flex-grow rounded-md border bg-muted p-4 h-96 overflow-y-auto">
              {isLoading && (
                 <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-primary animate-spin"/>
                 </div>
              )}
              {scheduleProposal && (
                <pre className="whitespace-pre-wrap text-sm">{scheduleProposal}</pre>
              )}
              {!isLoading && !scheduleProposal && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Your generated schedule will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
