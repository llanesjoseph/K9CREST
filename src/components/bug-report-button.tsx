"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Bug, X, Send, Loader2, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

interface ConsoleError {
  message: string;
  stack?: string;
  timestamp: string;
  type: "error" | "warn" | "info";
}

function BugReportButtonComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<ConsoleError[]>([]);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Prevent SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // Capture console errors
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      const errorMessage = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
        .join(" ");

      setErrors((prev) => [
        ...prev.slice(-9), // Keep last 10 errors
        {
          message: errorMessage,
          stack: args[0]?.stack || undefined,
          timestamp: new Date().toISOString(),
          type: "error",
        },
      ]);

      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const warnMessage = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
        .join(" ");

      setErrors((prev) => [
        ...prev.slice(-9),
        {
          message: warnMessage,
          timestamp: new Date().toISOString(),
          type: "warn",
        },
      ]);

      originalWarn.apply(console, args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      setErrors((prev) => [
        ...prev.slice(-9),
        {
          message: event.message,
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
          type: "error",
        },
      ]);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      setErrors((prev) => [
        ...prev.slice(-9),
        {
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          timestamp: new Date().toISOString(),
          type: "error",
        },
      ]);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [isMounted]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for the bug report",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          errors,
          userAgent: navigator.userAgent,
          url: window.location.href,
          userEmail: user?.email || "Anonymous",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit bug report");
      }

      setIsSuccess(true);
      toast({
        title: "Bug Report Sent!",
        description: "Thank you for helping us improve K9CREST",
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setTitle("");
        setDescription("");
        setErrors([]);
        setIsSuccess(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Failed to Send",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyErrorsToClipboard = () => {
    const errorText = errors
      .map(
        (e) =>
          `[${e.type.toUpperCase()}] ${e.timestamp}\n${e.message}\n${e.stack || ""}\n`
      )
      .join("\n---\n\n");

    navigator.clipboard.writeText(errorText);
    toast({
      title: "Copied!",
      description: "Console errors copied to clipboard",
    });
  };

  return (
    <>
      {/* Floating Bug Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110 ${
          errors.length > 0
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : "bg-orange-500 hover:bg-orange-600"
        }`}
        aria-label="Report a bug"
      >
        <Bug className="h-7 w-7 text-white m-auto" />
        {errors.length > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold border-2 border-white">
            {errors.length}
          </span>
        )}
      </button>

      {/* Bug Report Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Report a Bug
            </DialogTitle>
            <DialogDescription>
              Help us improve K9CREST by reporting bugs and issues you encounter.
            </DialogDescription>
          </DialogHeader>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-lg font-semibold">Bug Report Submitted!</p>
              <p className="text-sm text-muted-foreground">
                Thank you for helping us improve the platform.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="bug-title">Bug Title *</Label>
                <Input
                  id="bug-title"
                  placeholder="Brief description of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="bug-description">
                  Description (What happened? What did you expect?)
                </Label>
                <Textarea
                  id="bug-description"
                  placeholder="Provide more details about the bug..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Console Errors */}
              {errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Console Errors ({errors.length})</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyErrorsToClipboard}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-muted rounded-md p-3 max-h-64 overflow-y-auto font-mono text-xs">
                    {errors.map((error, index) => (
                      <div
                        key={index}
                        className={`mb-3 pb-3 border-b border-border last:border-0 ${
                          error.type === "error"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        <div className="font-semibold">
                          [{error.type.toUpperCase()}]{" "}
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="mt-1 text-foreground">{error.message}</div>
                        {error.stack && (
                          <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                            {error.stack}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Info */}
              <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 space-y-1">
                <div>
                  <strong>User:</strong> {user?.email || "Not logged in"}
                </div>
                {isMounted && (
                  <>
                    <div>
                      <strong>URL:</strong> {window.location.pathname}
                    </div>
                    <div className="break-all">
                      <strong>Browser:</strong> {navigator.userAgent}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Bug Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export with dynamic import to prevent SSR
export const BugReportButton = dynamic(
  () => Promise.resolve(BugReportButtonComponent),
  { ssr: false }
);
