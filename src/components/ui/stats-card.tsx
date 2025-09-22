"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    period: string;
  };
  icon: LucideIcon;
  description?: string;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantStyles = {
  default: {
    container: "border-slate-200 dark:border-slate-700",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    value: "text-slate-900 dark:text-slate-100"
  },
  success: {
    container: "border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    value: "text-green-900 dark:text-green-100"
  },
  warning: {
    container: "border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    value: "text-amber-900 dark:text-amber-100"
  },
  danger: {
    container: "border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    value: "text-red-900 dark:text-red-100"
  },
  info: {
    container: "border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    value: "text-blue-900 dark:text-blue-100"
  }
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  variant = "default"
}: StatsCardProps) {
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!change) return null;

    switch (change.type) {
      case "increase":
        return <TrendingUp className="h-3 w-3" />;
      case "decrease":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return "";

    switch (change.type) {
      case "increase":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
      case "decrease":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800";
    }
  };

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", styles.container, className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={cn("text-2xl font-bold", styles.value)}>
                {value}
              </p>
              {change && (
                <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  <span>
                    {Math.abs(change.value)}% {change.period}
                  </span>
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
      className
    )}>
      {children}
    </div>
  );
}