"use client";

import Link from "next/link";
import {
  Activity,
  Dog,
  ShieldCheck,
} from "lucide-react";

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

export default function LoginPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" asChild>
              <Link href="/dashboard">Login</Link>
            </Button>
            <Button variant="outline" className="w-full">
              Login with Google
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="#" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-12">
        <div className="flex items-center gap-4 text-primary mb-8">
            <Dog size={48} />
            <span className="text-4xl font-semibold">K9 Trial Pro</span>
        </div>
        <div className="space-y-6 max-w-md text-center">
            <h2 className="text-3xl font-bold tracking-tight">The Ultimate Platform for K9 Trial Excellence</h2>
            <p className="text-muted-foreground text-lg">
                Manage events, configure scoring, schedule competitors, and track results in real-time.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-4">
                <Card className="bg-background/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Fair Scoring</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Customizable rubrics and a dedicated judge interface ensure accurate and consistent scoring.</p>
                    </CardContent>
                </Card>
                <Card className="bg-background/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity className="text-primary"/> Real-time Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Live leaderboards for competitors and agencies keep everyone informed and engaged.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
