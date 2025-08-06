
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
      className={`h-full transition-all duration-200 ${
        disabled
          ? "bg-muted/50"
          : "hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
      }`}
    >
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );

  return disabled ? (
    <div className="cursor-not-allowed">{content}</div>
  ) : (
    <Link href={href} className="block">
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
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <Separator className="flex-1" />
      <h2 className="text-lg font-semibold text-muted-foreground">{title}</h2>
      <Separator className="flex-1" />
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
        description: "Create, edit, and oversee all trial events.",
      },
      {
        href: "/dashboard/users",
        icon: Users,
        title: "Manage Users",
        description: "Invite and manage platform user roles.",
      },
      {
        href: "/dashboard/events",
        icon: ListChecks,
        title: "Configure Rubrics",
        description: "Define scoring criteria for events.",
      },
    ],
    judge: [
      {
        href: "/dashboard/events",
        icon: Gavel,
        title: "Start Judging",
        description: "Select an active event to begin scoring.",
      },
    ],
    competitor: [
      {
        href: "/dashboard/events",
        icon: Trophy,
        title: "View Events",
        description: "See upcoming trials and live leaderboards.",
      },
    ],
    spectator: [
      {
        href: "/dashboard/events",
        icon: Trophy,
        title: "View Events",
        description: "Browse upcoming trials and see live leaderboards.",
      },
    ],
    common: [
      {
        href: "/dashboard/settings",
        icon: Settings,
        title: "Settings",
        description: "Manage your account and notification preferences.",
      },
    ],
  };

  const roleActions = menuConfig[currentRole] || menuConfig.spectator;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground text-lg flex items-center gap-2">
          You are logged in as a
          <span className="font-semibold text-primary capitalize">
            {currentRole}
          </span>
          {isTrueAdmin && viewAsRole && (
            <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
              (<Shield className="h-3 w-3" />
              viewing as <strong className="capitalize">{viewAsRole}</strong>)
            </span>
          )}
        </p>
      </div>

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
