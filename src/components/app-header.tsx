
"use client";

import Link from "next/link";
import {
  Dog,
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

function NavLink({ href, children, isActive }: { href: string, children: React.ReactNode, isActive?: boolean }) {
    return (
         <Button variant={isActive ? "secondary" : "ghost"} asChild className="text-muted-foreground hover:text-foreground data-[active]:text-foreground">
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

  const isActive = (path: string) => {
    if(!path) return false;
    // Check for exact match or if it's a parent path
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  const isEventPageActive = (subpath: string) => {
      if (!eventId) return false;
      return pathname === `/dashboard/events/${eventId}/${subpath}`;
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
        <Dog className="h-6 w-6 text-primary" />
        <span className="hidden sm:inline-block">K9 Trial Pro</span>
      </Link>
       <nav className="hidden md:flex items-center gap-2 mx-auto">
            <NavLink href="/dashboard/events" isActive={pathname.startsWith('/dashboard/events')}><Calendar className="mr-2"/> Events</NavLink>
            {eventId && (
                 <>
                    <NavLink href={`/dashboard/events/${eventId}/schedule`} isActive={isEventPageActive('schedule')}><ClipboardList className="mr-2"/> Schedule</NavLink>
                    {['admin', 'judge'].includes(currentRole) && <NavLink href={`/dashboard/rubrics`} isActive={pathname.startsWith(`/dashboard/rubrics`)}><ListChecks className="mr-2"/> Rubrics</NavLink>}
                    <NavLink href={`/dashboard/events/${eventId}/leaderboard`} isActive={isEventPageActive('leaderboard')}><Trophy className="mr-2"/> Leaderboard</NavLink>
                 </>
            )}
       </nav>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                 <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} data-ai-hint="person portrait" />
                <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
             <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{user?.displayName || user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize">{currentRole}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
             {isTrueAdmin && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View As</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setViewAsRole('admin')}>
                        <Shield className="mr-2 h-4 w-4" /> Admin {currentRole === 'admin' && '(Active)'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewAsRole('judge')}>
                        <Gavel className="mr-2 h-4 w-4" /> Judge {currentRole === 'judge' && '(Active)'}
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => setViewAsRole('competitor')}>
                        <User className="mr-2 h-4 w-4" /> Competitor {currentRole === 'competitor' && '(Active)'}
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => setViewAsRole('spectator')}>
                        <User className="mr-2 h-4 w-4" /> Spectator {currentRole === 'spectator' && '(Active)'}
                      </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
