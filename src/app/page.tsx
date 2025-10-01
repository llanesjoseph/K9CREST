
"use client";

import Link from "next/link";
import { Gavel, Calendar, Trophy, RadioTower } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

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
import { auth, googleProvider } from "@/lib/firebase";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 border-r min-h-screen">
        <div className="mx-auto grid w-[350px] gap-6">
          {/* Logo - visible on all screen sizes */}
          <div className="flex justify-center mb-4">
            <Image
              src="https://res.cloudinary.com/dr0jtjwlh/image/upload/v1755735658/core_LOGO_iaxkl6.png"
              alt="SCORE Logo"
              width={180}
              height={144}
              className="w-auto h-auto max-w-[180px] lg:max-w-[200px]"
              priority
            />
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {isSignUp ? 'Create your professional account' : 'Access your trial management dashboard'}
            </p>
          </div>
          <form onSubmit={handleSubmit(isSignUp ? handleSignUp : handleLogin)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register("email")}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="ml-auto inline-block text-sm underline"
                    onClick={async () => {
                      const emailInput = (document.getElementById('email') as HTMLInputElement | null)?.value || '';
                      if (!emailInput) {
                        toast({ variant: 'destructive', title: 'Enter email', description: 'Please enter your email to reset password.' });
                        return;
                      }
                      try {
                        await sendPasswordResetEmail(auth, emailInput);
                        toast({ title: 'Password reset email sent', description: 'Check your inbox for reset instructions.' });
                      } catch (e: any) {
                        toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to send reset email.' });
                      }
                    }}
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" {...register("password")} />
               {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
            <Button variant="outline" className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800" type="button" onClick={handleGoogleLogin}>
              Continue with Google
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
           <Image src="https://res.cloudinary.com/dr0jtjwlh/image/upload/v1755735658/core_LOGO_iaxkl6.png" alt="Core Logo" width={250} height={200} data-ai-hint="logo company" />
        </div>
        <div className="space-y-6 max-w-md text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Professional Trial Management System
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            Comprehensive event management, real-time scoring, competitor tracking, and advanced analytics for professional trials.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4">
            <Card className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Calendar className="text-blue-600 dark:text-blue-400 h-5 w-5" /> Event Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Streamlined event creation, scheduling, and comprehensive management tools.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Gavel className="text-blue-600 dark:text-blue-400 h-5 w-5" /> Scoring System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Advanced rubric configuration with real-time judge interface and scoring.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Trophy className="text-blue-600 dark:text-blue-400 h-5 w-5" /> Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Real-time leaderboards, comprehensive reporting, and performance analytics.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
