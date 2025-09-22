
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  LogOut,
  Shield,
  Eye,
  Settings,
  User,
  Gavel,
  ListChecks,
  Calendar,
  Trophy,
  ClipboardList,
  ClipboardCheck,
  Users,
  Menu,
  PanelLeft,
  Building2,
  LayoutGrid,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useAuth, UserRole } from "@/components/auth-provider";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function NavLink({ href, children, isActive, disabled }: { href: string, children: React.ReactNode, isActive?: boolean, disabled?: boolean }) {
    return (
         <Button variant={isActive ? "secondary" : "ghost"} asChild className="text-muted-foreground hover:text-foreground data-[active]:text-foreground disabled:opacity-50" disabled={disabled}>
            <Link href={href}>{children}</Link>
        </Button>
    )
}

export function AppHeader() {
  const { user, role, isTrueAdmin, setViewAsRole, viewAsRole } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const eventId = params ? (params.id as string) : null;

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/");
  };

  const currentRole = viewAsRole || role;

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, roles: ['admin', 'competitor', 'judge'] },
    { href: "/dashboard/events", label: "Events", icon: Calendar, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: "/dashboard/rubrics", label: "Rubrics", icon: ListChecks, roles: ['admin'] },
    { href: "/dashboard/reports", label: "Reports", icon: ClipboardList, roles: ['admin'] },
    { href: "/dashboard/analysis", label: "Analysis", icon: LineChart, roles: ['admin'] },
    { href: "/dashboard/users", label: "Users", icon: Users, roles: ['admin'] },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ['admin', 'judge', 'competitor', 'spectator'] },
  ].filter(item => {
    if (!currentRole) return false;
    if (['spectator'].includes(currentRole) && item.href === '/dashboard') return false;
    return item.roles.includes(currentRole);
  });

  const eventMenuItems = [
    { href: `/dashboard/events/${eventId}/schedule`, label: "Schedule", icon: ClipboardCheck, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: `/dashboard/events/${eventId}/competitors`, label: "Competitors", icon: Users, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: `/dashboard/events/${eventId}/leaderboard`, label: "Leaderboard", icon: Trophy, roles: ['admin', 'judge', 'competitor', 'spectator'] },
  ].filter(item => {
    if (!currentRole) return false;
    return item.roles.includes(currentRole);
  });

  const isActive = (href: string) => {
    if (!href) return false;

    if (eventId) {
      if (pathname === href) return true;
      if (pathname.startsWith(href) && href !== `/dashboard/events/${eventId}` && href !== '/dashboard/events') return true;
    }

    if (pathname.startsWith(href) && href !== '/dashboard') return true;
    if (pathname === '/dashboard' && href === '/dashboard') return true;
    if (pathname === '/dashboard/events' && href === '/dashboard/events') return true;

    return false;
  };
  
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg group">
          <Image
            src="https://res.cloudinary.com/dr0jtjwlh/image/upload/v1755946406/SCORE_gl8aws.png"
            alt="SCORE Logo"
            width={120}
            height={40}
            className="h-8 w-auto transition-all duration-200 group-hover:opacity-90"
          />
        </Link>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/80 transition-all duration-200">
                <Avatar className="ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200">
                  <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} data-ai-hint="person portrait" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold leading-none truncate text-foreground">
                    {user?.displayName || user?.email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                      {currentRole}
                    </span>
                    {isTrueAdmin && viewAsRole && (
                      <span className="text-xs text-muted-foreground">
                        (Viewing as {viewAsRole})
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isTrueAdmin && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View As</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="p-2">
                      <DropdownMenuItem
                        onClick={() => setViewAsRole('admin')}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Admin {currentRole === 'admin' && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setViewAsRole('judge')}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                      >
                        <Gavel className="mr-2 h-4 w-4" />
                        Judge {currentRole === 'judge' && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setViewAsRole('competitor')}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Competitor {currentRole === 'competitor' && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setViewAsRole('spectator')}
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Spectator {currentRole === 'spectator' && (
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="p-3 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-t bg-muted/30">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap border-b-2",
                    active
                      ? "text-primary border-primary bg-background"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {eventId && eventMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap border-b-2",
                    active
                      ? "text-primary border-primary bg-background"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
