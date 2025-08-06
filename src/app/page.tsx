
"use client";

import Link from "next/link";
import { Gavel, Calendar, Trophy, RadioTower } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type FormValues = z.infer<typeof formSchema>;

interface LiveEvent {
    id: string;
    name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  useEffect(() => {
    const fetchLiveEvent = async () => {
        try {
            const today = Timestamp.now();
            const eventsRef = collection(db, "events");
            
            // Query for events where today is between start and end dates
            // Firestore does not support two inequality filters on different fields.
            // So we query for startDate <= today and then filter by endDate >= today on the client.
            const q = query(eventsRef, where("startDate", "<=", today));
            const querySnapshot = await getDocs(q);

            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const currentEvent = events.find(event => {
                 const endDate = event.endDate?.toDate();
                 // If there's an end date, it must be today or in the future.
                 // If no end date, we assume it's a single-day event.
                 return endDate ? endDate >= new Date() : true;
            });
            
            if (currentEvent) {
                setLiveEvent({ id: currentEvent.id, name: currentEvent.name });
            }

        } catch (error) {
            console.error("Error fetching live event:", error);
        } finally {
            setIsLoadingEvent(false);
        }
    };

    fetchLiveEvent();
  }, []);

  const handleLogin: SubmitHandler<FormValues> = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Success", description: "Logged in successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };
  
  const handleSignUp: SubmitHandler<FormValues> = async ({ email, password }) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Success", description: "Account created successfully. Please log in." });
      setIsSignUp(false); // Switch to login view
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Success", description: "Logged in successfully." });
      router.push("/dashboard");
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 border-r">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">{isSignUp ? 'Sign Up' : 'Login'}</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to {isSignUp ? 'create an account' : 'login to your account'}
            </p>
          </div>
          <form onSubmit={handleSubmit(isSignUp ? handleSignUp : handleLogin)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                   <Link
                    href="#"
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </Link>
                )}
              </div>
              <Input id="password" type="password" {...register("password")} />
               {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full">
              {isSignUp ? 'Create Account' : 'Login'}
            </Button>
            <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin}>
              Login with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Login' : 'Sign up'}
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-start p-12 pt-24">
        <div className="flex items-center gap-4 text-primary mb-8">
           <Image src="https://res.cloudinary.com/di8qgld2h/image/upload/v1721950942/desertdog_k9_1x_lgt1y2.png" alt="Desert Dog Trials Logo" width={150} height={150} data-ai-hint="logo company" />
        </div>
        <div className="space-y-6 max-w-md text-center">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            The Ultimate Platform for K9 Trial Excellence
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Manage events, configure scoring, schedule competitors, and track
            results in real-time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-primary" /> Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                 Easily create and manage all your trial events in one place.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Gavel className="text-primary" /> Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Customizable rubrics and a dedicated judge interface.
                </p>
              </CardContent>
            </Card>
             <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="text-primary" /> Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Live leaderboards for competitors and agencies.
                </p>
              </CardContent>
            </Card>
          </div>

          {liveEvent && (
              <Link href={`/dashboard/events/${liveEvent.id}/leaderboard`} className="block w-full mt-6">
                <Card className="bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors">
                    <CardHeader className="flex-row items-center gap-4">
                        <RadioTower className="h-8 w-8 text-primary animate-pulse" />
                        <div>
                            <CardTitle className="text-lg text-left">Event Live Now!</CardTitle>
                            <CardDescription className="text-left">{liveEvent.name}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}

    