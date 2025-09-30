
"use client";

import {
  Calendar,
  Users,
  Settings,
  LayoutGrid,
  Trophy,
  Gavel,
  ListChecks,
  Shield,
  Eye,
  Activity,
  Award,
  Clock,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useAuth, UserRole } from "@/components/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { LoadingCard } from "@/components/ui/loading";

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
}

const ActionCard = ({
  title,
  description,
  icon: Icon,
  href,
  disabled = false,
}: ActionCardProps) => {
  const content = (
    <Card
      className={`h-full transition-all duration-200 group ${
        disabled
          ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      <CardHeader className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg transition-all duration-200 ${
            disabled
              ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 group-hover:scale-105"
          }`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  return disabled ? (
    <div className="cursor-not-allowed">{content}</div>
  ) : (
    <Link href={href} className="block group">
      {content}
    </Link>
  );
};

const RoleSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <h2 className="text-xl font-semibold text-muted-foreground bg-gradient-to-r from-muted-foreground to-foreground bg-clip-text text-transparent">
        {title}
      </h2>
      <Separator className="flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {children}
    </div>
  </div>
);

export default function Dashboard() {
  const { role, user, isTrueAdmin, viewAsRole } = useAuth();
  const displayName = user?.displayName || user?.email;
  const currentRole =
    (viewAsRole as UserRole) || (role as UserRole) || "spectator";

  const menuConfig = {
    admin: [
      {
        href: "/dashboard/events",
        icon: Calendar,
        title: "Manage Events",
        description: "Create, edit, and oversee all trial events with comprehensive management tools.",
      },
      {
        href: "/dashboard/users",
        icon: Users,
        title: "Manage Users",
        description: "Invite and manage platform user roles with advanced permissions.",
      },
    ],
    judge: [
      {
        href: "/dashboard/events",
        icon: Gavel,
        title: "Start Judging",
        description: "Select an active event to begin scoring and evaluation.",
      },
    ],
    competitor: [
      {
        href: "/dashboard/events",
        icon: Trophy,
        title: "View Events",
        description: "See upcoming trials and live leaderboards with real-time updates.",
      },
    ],
    spectator: [
      {
        href: "/dashboard/events",
        icon: Trophy,
        title: "View Events",
        description: "Browse upcoming trials and see live leaderboards as they happen.",
      },
    ],
    common: [
      {
        href: "/dashboard/settings",
        icon: Settings,
        title: "Settings",
        description: "Manage your account preferences and notification settings.",
      },
    ],
  };

  const roleActions = menuConfig[currentRole] || menuConfig.spectator;

  return (
    <div className="flex flex-col gap-10 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Welcome back, {displayName}!
          </h1>
          <p className="text-lg text-muted-foreground flex items-center gap-3">
            You are logged in as a
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary capitalize">
              {currentRole}
            </span>
            {isTrueAdmin && viewAsRole && (
              <span className="text-sm font-medium text-muted-foreground/80 flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                <Shield className="h-4 w-4" />
                viewing as <strong className="capitalize">{viewAsRole}</strong>
              </span>
            )}
          </p>
        </div>
        
        {/* Dashboard Stats */}
        <StatsGrid className="pt-4">
          <StatsCard
            title="Current Role"
            value={currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
            icon={UserCheck}
            variant="info"
            description={isTrueAdmin && viewAsRole ? "Admin viewing mode" : "Active session"}
          />
        </StatsGrid>
      </div>

      {/* Action Cards Section */}
      <RoleSection title={`${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Actions`}>
        {roleActions.map((item) => (
          <ActionCard key={item.href} {...item} />
        ))}
        {menuConfig.common.map((item) => (
          <ActionCard key={item.href} {...item} />
        ))}
      </RoleSection>
    </div>
  );
}
