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
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/judging/1", label: "Judging", icon: Gavel },
  { href: "/dashboard/events/1/leaderboard", label: "Leaderboards", icon: Trophy },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
        return pathname === href;
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
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={isActive(item.href)}
                  tooltip={{
                    children: item.label,
                    side: "right",
                  }}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-4 p-2 mt-auto">
        <Card className="bg-secondary">
          <CardContent className="p-3">
             <h3 className="font-semibold mb-2">Need Help?</h3>
             <p className="text-xs text-muted-foreground mb-3">Check our documentation or contact support.</p>
             <Link href="#"><Button size="sm" className="w-full">Get Help</Button></Link>
          </CardContent>
        </Card>
        <Separator />
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-muted-foreground">
              admin@k9pro.com
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
