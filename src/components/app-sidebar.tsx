
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
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
  Building2,
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
      <SidebarHeader className="p-4 border-b border-sidebar-border/20">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-data-[collapsible=icon]:hidden">
              K9 CREST
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
                    className="justify-start h-10 px-3 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/50 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 dark:data-[active=true]:bg-blue-900/20 dark:data-[active=true]:text-blue-300"
                    onClick={() => setOpenMobile(false)}
                >
                    <Link href={item.href} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5">
                      <item.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden font-medium text-slate-700 dark:text-slate-300">
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
                                className="justify-start h-10 px-3 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/50 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 dark:data-[active=true]:bg-blue-900/20 dark:data-[active=true]:text-blue-300"
                                onClick={() => setOpenMobile(false)}
                            >
                                <Link href={item.href} className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-5 h-5">
                                  <item.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <span className="group-data-[collapsible=icon]:hidden font-medium text-slate-700 dark:text-slate-300">
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
                        <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-150">
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
      
      <SidebarFooter className="flex flex-col gap-4 p-3 mt-auto border-t border-slate-200 dark:border-slate-700">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-md p-3 transition-all duration-150 group"
        >
          <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all duration-150">
            <AvatarImage src={user?.photoURL || `https://placehold.co/32x32`} data-ai-hint="person portrait" />
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-sm">
              {user?.email?.[0].toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
              {user?.displayName || user?.email || "User"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {role.charAt(0).toUpperCase() + role.slice(1)}
              {viewAsRole && isTrueAdmin ? ` (${viewAsRole})` : ''}
            </span>
          </div>
           <Button
             variant="ghost"
             size="icon"
             onClick={handleSignOut}
             className="shrink-0 group-data-[collapsible=icon]:hidden hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 h-8 w-8"
           >
             <LogOut className="h-4 w-4" />
           </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
