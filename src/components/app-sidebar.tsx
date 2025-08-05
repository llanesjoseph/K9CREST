
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
  FilePlus,
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
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/judging/1", label: "Judging", icon: Gavel },
  { href: "/dashboard/events/1/leaderboard", label: "Leaderboards", icon: Trophy },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminMenuItems = [
    { href: "/dashboard/events/create", label: "Create Event", icon: FilePlus },
    { href: "/dashboard/events", label: "Manage Rubrics", icon: ListChecks },
    { href: "/dashboard/events", label: "Import Competitors", icon: FileUp },
]

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/");
  };


  const isActive = (href: string) => {
    if (href === "/dashboard") {
        return pathname === href;
    }
    // For create event, we want to highlight the parent "Events" tab
    if (pathname.startsWith('/dashboard/events/create') && href === '/dashboard/events') {
        return true;
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Dog className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">K9 Trial Pro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
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
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {isAdmin && (
            <SidebarGroup className="pt-4">
                <SidebarGroupLabel className="flex items-center">
                    <Shield className="mr-2" />
                    Admin Tools
                </SidebarGroupLabel>
                 <SidebarMenu>
                    {adminMenuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive(item.href)}
                            tooltip={{
                            children: item.label,
                            side: "right",
                            }}
                            className="justify-start"
                            variant="ghost"
                        >
                            <Link href={item.href}>
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-4 p-2 mt-auto">
        <Separator />
        <Link href="/dashboard/settings" className="flex items-center gap-3 hover:bg-muted/50 rounded-md p-2 transition-colors">
          <Avatar>
            <AvatarImage src={user?.photoURL || `https://placehold.co/40x40`} />
            <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.displayName || user?.email || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email}
            </span>
          </div>
           <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0">
             <LogOut className="h-4 w-4" />
           </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
