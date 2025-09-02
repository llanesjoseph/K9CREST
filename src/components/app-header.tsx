
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
  ClipboardCheck,
  Users,
  Menu,
  PanelLeft,
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
import { useSidebar } from "./ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

function NavLink({ href, children, isActive, disabled }: { href: string, children: React.ReactNode, isActive?: boolean, disabled?: boolean }) {
    return (
         <Button variant={isActive ? "secondary" : "ghost"} asChild className="text-muted-foreground hover:text-foreground data-[active]:text-foreground disabled:opacity-50" disabled={disabled}>
            <Link href={href}>{children}</Link>
        </Button>
    )
}

export function AppHeader() {
  const { user, role, isTrueAdmin, setViewAsRole, viewAsRole } = useAuth();
  const { isMobile, toggleSidebar } = useSidebar();
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
    if (!path) return false;
    
    // Handle specific event pages
    if (eventId) {
        const basePath = `/dashboard/events/${eventId}`;
        const fullPath = path.startsWith('/') ? path : `${basePath}/${path}`;
         if (pathname === fullPath || pathname.startsWith(`${fullPath}/`)) return true;
    }

    // Handle non-event pages
    if (pathname.startsWith(path)) return true;
    
    return false;
  };
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-md shadow-soft px-4 sm:px-6 lg:px-8">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleSidebar} 
        className="-ml-2 hover:bg-accent/80 transition-all duration-200"
      >
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
      
      <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg group">
        <div className="bg-primary p-2 rounded-xl shadow-glow transition-all duration-300 group-hover:shadow-glow group-hover:scale-105">
          <Dog className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="hidden sm:inline-block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          K9 Trial Pro
        </span>
      </Link>
      
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/80 transition-all duration-200 hover:shadow-soft">
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
            <DropdownMenuItem asChild className="p-3 cursor-pointer hover:bg-accent/50 transition-colors duration-150">
              <Link href="/dashboard/settings" className="flex items-center gap-3">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
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
    </header>
  );
}
