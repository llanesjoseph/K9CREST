
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dog,
  LayoutGrid,
  Calendar,
  Gavel,
  Trophy,
  Settings,
  Users,
  LogOut,
  Shield,
  FileUp,
  ListChecks,
  Eye,
  ClipboardList,
  ClipboardCheck,
  LineChart,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useAuth, UserRole } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "./ui/label";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { user, role, isTrueAdmin, setViewAsRole, viewAsRole } = useAuth();
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const eventId = params ? (params.id as string) : null;

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/");
  };
  
  const currentRole = viewAsRole || role;
  
  const menuItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, roles: ['admin', 'competitor', 'judge'] },
      { href: "/dashboard/events", label: "Events", icon: Calendar, roles: ['admin', 'judge', 'competitor', 'spectator'] },
      { href: "/dashboard/rubrics", label: "Manage Rubrics", icon: ListChecks, roles: ['admin'] },
      { href: "/dashboard/reports", label: "Reports", icon: ClipboardList, roles: ['admin'] },
      { href: "/dashboard/analysis", label: "Analysis", icon: LineChart, roles: ['admin'] },
      { href: "/dashboard/users", label: "Users", icon: Users, roles: ['admin'] },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ['admin', 'judge', 'competitor', 'spectator'] },
  ].filter(item => {
      if (!currentRole) return false;
      // Hide dashboard for roles that don't need a central hub
      if (['spectator'].includes(currentRole) && item.href === '/dashboard') return false;

      const hasRole = item.roles.includes(currentRole);
      return hasRole;
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
    
    // Handle specific event pages
    if (eventId) {
        if(pathname === href) return true;
        if(pathname.startsWith(href) && href !== `/dashboard/events/${eventId}` && href !== '/dashboard/events') return true;
    }

    // Handle non-event pages
    if (pathname.startsWith(href) && href !== '/dashboard') return true;
    if (pathname === '/dashboard' && href === '/dashboard') return true;
    if (pathname === '/dashboard/events' && href === '/dashboard/events') return true;
    
    return false;
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/50">
      <SidebarHeader className="p-4 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3">
            <div className="bg-sidebar-primary p-2 rounded-xl shadow-glow transition-all duration-300 group-hover:shadow-glow group-hover:scale-105">
                <Dog className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/70 bg-clip-text text-transparent">
              K9 Trial Pro
            </h1>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-3 space-y-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={{
                    children: item.label,
                    side: "right",
                    }}
                    className="justify-start h-11 px-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/60 hover:shadow-soft group-data-[collapsible=icon]:hover:bg-sidebar-accent/80"
                    onClick={() => setOpenMobile(false)}
                >
                    <Link href={item.href} className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-sidebar-accent/30 group-hover:bg-sidebar-primary/20 transition-colors duration-200">
                      <item.icon className="h-5 w-5 text-sidebar-foreground/80 group-hover:text-sidebar-foreground transition-colors duration-200" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden font-medium text-sidebar-foreground/90 group-hover:text-sidebar-foreground transition-colors duration-200">
                      {item.label}
                    </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        {eventId && (
             <SidebarGroup className="pt-6 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3">
                  Event Menu
                </SidebarGroupLabel>
                 <SidebarMenu>
                    {eventMenuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive(item.href)}
                                tooltip={{
                                children: item.label,
                                side: "right",
                                }}
                                className="justify-start h-11 px-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/60 hover:shadow-soft group-data-[collapsible=icon]:hover:bg-sidebar-accent/80"
                                onClick={() => setOpenMobile(false)}
                            >
                                <Link href={item.href} className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-sidebar-accent/30 group-hover:bg-sidebar-primary/20 transition-colors duration-200">
                                  <item.icon className="h-5 w-5 text-sidebar-foreground/80 group-hover:text-sidebar-foreground transition-colors duration-200" />
                                </div>
                                <span className="group-data-[collapsible=icon]:hidden font-medium text-sidebar-foreground/90 group-hover:text-sidebar-foreground transition-colors duration-200">
                                  {item.label}
                                </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
             </SidebarGroup>
        )}
        
        {isTrueAdmin && (
            <SidebarGroup className="pt-6 group-data-[collapsible=icon]:hidden">
                <div className="px-3 space-y-3">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                        <Eye className="h-4 w-4" />
                        View As
                    </Label>
                    <Select onValueChange={(value) => setViewAsRole(value as UserRole)} value={viewAsRole || 'admin'}>
                        <SelectTrigger className="h-10 bg-sidebar-accent/30 border-sidebar-border/50 hover:bg-sidebar-accent/50 text-sidebar-foreground transition-all duration-200 hover:shadow-soft">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="judge">Judge</SelectItem>
                            <SelectItem value="competitor">Competitor</SelectItem>
                            <SelectItem value="spectator">Spectator</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="flex flex-col gap-4 p-3 mt-auto border-t border-sidebar-border/30">
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-3 hover:bg-sidebar-accent/50 rounded-lg p-3 transition-all duration-200 hover:shadow-soft group"
        >
          <Avatar className="group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 ring-2 ring-transparent group-hover:ring-sidebar-primary/20 transition-all duration-200">
            <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} data-ai-hint="person portrait" />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-semibold">
              {user?.email?.[0].toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold truncate text-sidebar-foreground">
              {user?.displayName || user?.email || "User"}
            </span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {role.charAt(0).toUpperCase() + role.slice(1)} 
              {viewAsRole && isTrueAdmin ? ` (Viewing as ${viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1)})` : ''}
            </span>
          </div>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={handleSignOut} 
             className="shrink-0 group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent/80 hover:text-sidebar-foreground transition-all duration-200"
           >
             <LogOut className="h-4 w-4" />
           </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
