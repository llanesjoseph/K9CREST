"use client";

import { useAuth, UserRole } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { Shield, Gavel, User, Eye } from "lucide-react";

const roleConfig = [
  {
    role: "admin" as UserRole,
    label: "Admin",
    icon: Shield,
    description: "Full system access",
    color: "bg-red-500 text-white border-red-500",
    activeColor: "bg-red-600 border-red-600",
    hoverColor: "hover:bg-red-50 dark:hover:bg-red-900/20"
  },
  {
    role: "judge" as UserRole,
    label: "Judge",
    icon: Gavel,
    description: "Scoring & evaluation",
    color: "bg-purple-500 text-white border-purple-500",
    activeColor: "bg-purple-600 border-purple-600",
    hoverColor: "hover:bg-purple-50 dark:hover:bg-purple-900/20"
  },
  {
    role: "competitor" as UserRole,
    label: "Competitor",
    icon: User,
    description: "Participant view",
    color: "bg-green-500 text-white border-green-500",
    activeColor: "bg-green-600 border-green-600",
    hoverColor: "hover:bg-green-50 dark:hover:bg-green-900/20"
  },
  {
    role: "spectator" as UserRole,
    label: "Spectator",
    icon: Eye,
    description: "Public view",
    color: "bg-blue-500 text-white border-blue-500",
    activeColor: "bg-blue-600 border-blue-600",
    hoverColor: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
  }
];

export function RoleSwitcherTabs() {
  const { isTrueAdmin, viewAsRole, setViewAsRole, role } = useAuth();

  // Only show if user is a true admin
  if (!isTrueAdmin) return null;

  const currentRole = viewAsRole || role;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b-2 border-blue-200 dark:border-blue-800 px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Admin Role Switcher
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {roleConfig.map((roleItem) => {
              const isActive = currentRole === roleItem.role;
              const Icon = roleItem.icon;

              return (
                <button
                  key={roleItem.role}
                  onClick={() => setViewAsRole(roleItem.role)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium relative",
                    isActive
                      ? cn(roleItem.color, "shadow-md transform scale-105")
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{roleItem.label}</span>
                  <span className="md:hidden">{roleItem.label.substring(0, 3)}</span>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-current rounded-full opacity-80"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Currently viewing as:
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {currentRole}
            </span>
            {viewAsRole && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
                Admin Mode
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}