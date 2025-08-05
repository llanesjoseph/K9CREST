
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useAuth, UserRole } from "@/components/auth-provider";
import { useRouter, useParams } from "next/navigation";
import { CompetitorImportDialog } from "./competitor-import-dialog";
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
  const router = useRouter();
  const eventId = params.id as string;

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === href;
    if (pathname.startsWith('/dashboard/events/create') && href === '/dashboard/events') return true;
    return pathname.startsWith(href);
  };
  
  const menuConfig = {
    spectator: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
        { href: "/dashboard/events", label: "Events", icon: Calendar },
        { href: `/dashboard/events/${eventId || 1}/leaderboard`, label: "Leaderboards", icon: Trophy, eventSpecific: true },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
    competitor: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
        { href: "/dashboard/events", label: "Events", icon: Calendar },
        { href: `/dashboard/events/${eventId || 1}/leaderboard`, label: "Leaderboards", icon: Trophy, eventSpecific: true },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
    judge: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
        { href: "/dashboard/events", label: "Events", icon: Calendar },
        { href: `/dashboard/judging/${eventId || 1}`, label: "Judging", icon: Gavel, eventSpecific: true },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
    admin: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
        { href: "/dashboard/events", label: "Events", icon: Calendar },
        { component: CompetitorImportDialog, label: "Import Competitors", icon: Users, eventSpecific: true },
        { href: `/dashboard/events/${eventId}/rubric`, label: "Configure Rubric", icon: ListChecks, eventSpecific: true },
        { href: `/dashboard/judging/${eventId || 1}`, label: "Judging", icon: Gavel, eventSpecific: true },
        { href: `/dashboard/events/${eventId || 1}/leaderboard`, label: "Leaderboards", icon: Trophy, eventSpecific: true },
        { href: "/dashboard/users", label: "Users", icon: Users },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ]
  }
  
  const menuItems = menuConfig[role] || menuConfig.spectator;

  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
            <Dog className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">K9 Trial Pro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarMenu>
          {menuItems.map((item) => {
             const disabled = item.eventSpecific && !eventId;
             if (item.component) {
                const Comp = item.component
                return (
                     <SidebarMenuItem key={item.label}>
                        <Comp eventId={eventId} />
                     </SidebarMenuItem>
                )
             }
             return (
                <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={{
                        children: item.label,
                        side: "right",
                        }}
                        className="justify-start"
                        disabled={disabled}
                    >
                        <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                )
          })}
        </SidebarMenu>
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
        <Link href="/dashboard/settings" className="flex items-center gap-3 hover:bg-muted/50 rounded-md p-2 transition-colors">
          <Avatar className="group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} />
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

    