"use client";

import { cn } from "@/lib/utils";
import { Loader2, BarChart3 } from "lucide-react";

// Basic loading spinner
export function LoadingSpinner({ className, size = "default" }: {
  className?: string;
  size?: "sm" | "default" | "lg"
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
  );
}

// Loading skeleton for cards
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-700 rounded", className)} />
  );
}

// Loading state for cards
export function LoadingCard() {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <LoadingSkeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-5 w-3/4" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// Full screen loading
export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-lg shadow-sm">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <LoadingSpinner size="lg" />
      </div>
      <p className="text-slate-600 dark:text-slate-400 font-medium">{message}</p>
    </div>
  );
}

// Data loading state
export function DataLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-y-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <LoadingSkeleton className="h-4 w-4 rounded-full mr-3" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-3 w-3/4" />
          </div>
          <LoadingSkeleton className="h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// Page loading with progress
export function PageLoading({ progress }: { progress?: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-6 p-8">
        <div className="flex items-center justify-center">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Loading K9 CREST
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Preparing your trial management dashboard...
          </p>
        </div>

        {progress !== undefined && (
          <div className="w-64 mx-auto">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}