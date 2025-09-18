"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string } ; reset: () => void; }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="max-w-lg w-full card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Something went wrong</CardTitle>
            <CardDescription>We encountered an unexpected error. You can try again or go back home.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={reset} className="btn-primary">Try again</Button>
            <Button variant="secondary" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}

