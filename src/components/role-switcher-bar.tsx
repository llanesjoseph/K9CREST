"use client";

import { Shield, Gavel, User, Eye } from "lucide-react";
import { useAuth, UserRole } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const roleConfig = {
  admin: {
    icon: Shield,
    label: "Admin",
    color: "bg-red-500",
    hoverColor: "hover:bg-red-600",
    activeColor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    description: "Full system access"
  },
  judge: {
    icon: Gavel,
    label: "Judge",
    color: "bg-purple-500",
    hoverColor: "hover:bg-purple-600",
    activeColor: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    description: "Event scoring & judging"
  },
  competitor: {
    icon: User,
    label: "Competitor",
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
    activeColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    description: "Participant view"
  },
  spectator: {
    icon: Eye,
    label: "Spectator",
    color: "bg-blue-500",
    hoverColor: "hover:bg-blue-600",
    activeColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    description: "View-only access"
  },
};

export function RoleSwitcherBar() {
  const { isTrueAdmin, viewAsRole, setViewAsRole } = useAuth();

  // Only show for true admins
  if (!isTrueAdmin) return null;

  const currentRole = viewAsRole || 'admin';

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border-b-2 border-amber-200 dark:border-amber-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
              <Shield className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                🔧 Admin Mode - Switch Role:
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              const isActive = currentRole === role;

              return (
                <button
                  key={role}
                  onClick={() => setViewAsRole(role as UserRole)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 shadow-sm hover:shadow-md transform hover:scale-105",
                    isActive
                      ? config.activeColor + " shadow-lg scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg text-white transition-colors duration-200",
                    isActive ? config.color : "bg-slate-400 dark:bg-slate-600"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="leading-none font-semibold">{config.label}</span>
                    <span className="text-xs opacity-80 leading-none mt-1">
                      {config.description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-current opacity-75 animate-pulse" />
                      <span className="text-xs font-bold opacity-90">ACTIVE</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}