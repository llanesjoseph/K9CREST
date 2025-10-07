"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Dog, User, Building2, Award } from 'lucide-react';
import { format } from 'date-fns';

type EventInfo = {
  id: string;
  name: string;
  location?: string;
  startDate?: any;
  endDate?: any;
  description?: string;
};

type SpecialtyOption = {
  id: string;
  label: string;
  type: 'Bite Work' | 'Detection';
  detectionType?: 'Narcotics' | 'Explosives';
};

const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  { id: 'bite_work', label: 'Bite Work / Patrol', type: 'Bite Work' },
  { id: 'narcotics', label: 'Narcotics Detection', type: 'Detection', detectionType: 'Narcotics' },
  { id: 'explosives', label: 'Explosives Detection', type: 'Detection', detectionType: 'Explosives' },
];

export default function EventRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form data
  const [handlerName, setHandlerName] = useState('');
  const [handlerEmail, setHandlerEmail] = useState('');
  const [dogName, setDogName] = useState('');
  const [agency, setAgency] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() } as EventInfo);
      } else {
        toast({
          title: 'Event Not Found',
          description: 'This event does not exist or the link is invalid.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyToggle = (specialtyId: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialtyId)
        ? prev.filter(id => id !== specialtyId)
        : [...prev, specialtyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!handlerName || !dogName || !agency || !handlerEmail) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Convert selected specialties to structured format
      const specialties = selectedSpecialties.map(id => {
        const option = SPECIALTY_OPTIONS.find(opt => opt.id === id)!;
        if (option.type === 'Detection') {
          return {
            type: 'Detection',
            detectionType: option.detectionType,
          };
        }
        return { type: option.type };
      });

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          handlerName,
          handlerEmail,
          dogName,
          agency,
          specialties,
          additionalInfo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast({
          title: 'Registration Successful!',
          description: 'You will receive a confirmation email shortly.',
        });
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Event Not Found</CardTitle>
            <CardDescription>This registration link is invalid or the event no longer exists.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Registration Complete!</CardTitle>
            <CardDescription>
              Thank you for registering for <strong>{event.name}</strong>.
              <br />
              A confirmation email has been sent to <strong>{handlerEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You may close this page. See you at the event!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{event.name}</CardTitle>
            <CardDescription>
              {event.location && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="h-4 w-4" />
                  {event.location}
                </div>
              )}
              {event.startDate && (
                <div className="flex items-center gap-2 mt-1 text-sm">
                  {format(event.startDate.toDate(), 'MMMM dd, yyyy')}
                  {event.endDate && ` - ${format(event.endDate.toDate(), 'MMMM dd, yyyy')}`}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          {event.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-6 w-6" />
              Competitor Registration
            </CardTitle>
            <CardDescription>
              Fill out the form below to register for this event. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Handler Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Handler Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="handlerName">Handler Name *</Label>
                  <Input
                    id="handlerName"
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="handlerEmail">Email Address *</Label>
                  <Input
                    id="handlerEmail"
                    type="email"
                    value={handlerEmail}
                    onChange={(e) => setHandlerEmail(e.target.value)}
                    placeholder="john.doe@agency.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll receive a confirmation email at this address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency">Agency / Department *</Label>
                  <Input
                    id="agency"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="Metro Police Department"
                    required
                  />
                </div>
              </div>

              {/* K9 Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Dog className="h-5 w-5" />
                  K9 Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="dogName">K9 Name *</Label>
                  <Input
                    id="dogName"
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                    placeholder="Rex"
                    required
                  />
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Specialties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select all specialties that apply to your K9 team
                </p>

                <div className="space-y-3">
                  {SPECIALTY_OPTIONS.map((specialty) => (
                    <div key={specialty.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={specialty.id}
                        checked={selectedSpecialties.includes(specialty.id)}
                        onCheckedChange={() => handleSpecialtyToggle(specialty.id)}
                      />
                      <Label
                        htmlFor={specialty.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {specialty.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                <textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any special requirements, certifications, or notes..."
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting Registration...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
