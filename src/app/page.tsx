
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

import { Button } from "@/components/ui/button";
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
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md px-6 py-12">
        {/* Logo - visible on all screen sizes */}
        <div className="flex justify-center mb-8">
          <Image
            src="https://res.cloudinary.com/dr0jtjwlh/image/upload/v1755735658/core_LOGO_iaxkl6.png"
            alt="SCORE Logo"
            width={200}
            height={160}
            className="w-auto h-auto max-w-[200px]"
            priority
          />
        </div>

        <div className="grid gap-2 text-center mb-6">
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
  );
}
