
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
      className={`h-full transition-all duration-300 group ${
        disabled
          ? "bg-muted/30 border-muted/50 cursor-not-allowed opacity-60"
          : "card-interactive bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 hover:shadow-large"
      }`}
    >
      <CardHeader className="flex flex-row items-start gap-4 p-6">
        <div className={`p-3 rounded-xl transition-all duration-300 ${
          disabled 
            ? "bg-muted/50 text-muted-foreground" 
            : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2 flex-1">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Role</p>
                <p className="text-lg font-semibold text-foreground capitalize">{currentRole}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-secondary/5 to-secondary/10 border border-secondary/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Events</p>
                <p className="text-lg font-semibold text-foreground">View All</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Settings className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Settings</p>
                <p className="text-lg font-semibold text-foreground">Configure</p>
              </div>
            </div>
          </div>
        </div>
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
