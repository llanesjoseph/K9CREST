

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary p-1.5 rounded-lg group-data-[collapsible=icon]:-ml-0.5">
                <Dog className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">K9 Trial Pro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
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
                    className="justify-start"
                    onClick={() => setOpenMobile(false)}
                >
                    <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {eventId && (
             <SidebarGroup className="pt-4 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel>Event Menu</SidebarGroupLabel>
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
                                className="justify-start"
                                onClick={() => setOpenMobile(false)}
                            >
                                <Link href={item.href}>
                                <item.icon className="h-5 w-5" />
                                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
             </SidebarGroup>
        )}
        {isTrueAdmin && (
            <SidebarGroup className="pt-4 group-data-[collapsible=icon]:hidden">
                <div className="px-2 pt-4">
                    <Label className="flex items-center gap-2 text-xs text-sidebar-foreground/70 mb-2">
                        <Eye className="h-4 w-4" />
                        View As
                    </Label>
                    <Select onValueChange={(value) => setViewAsRole(value as UserRole)} value={viewAsRole || 'admin'}>
                        <SelectTrigger className="h-9 bg-sidebar-accent/20 border-sidebar-border hover:bg-sidebar-accent/30 text-sidebar-foreground">
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
      <SidebarFooter className="flex flex-col gap-4 p-2 mt-auto">
        <Separator />
        <Link href="/dashboard/settings" className="flex items-center gap-3 hover:bg-sidebar-accent rounded-md p-2 transition-colors">
          <Avatar className="group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} data-ai-hint="person portrait" />
            <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{user?.displayName || user?.email || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {role.charAt(0).toUpperCase() + role.slice(1)} {viewAsRole && isTrueAdmin ? `(Viewing as ${viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1)})` : ''}
            </span>
          </div>
           <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0 group-data-[collapsible=icon]:hidden">
             <LogOut className="h-4 w-4" />
           </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}


