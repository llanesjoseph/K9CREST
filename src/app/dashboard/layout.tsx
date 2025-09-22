
"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { RoleSwitcherTabs } from "@/components/role-switcher-tabs";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();

  if (!user) {
    // AuthProvider handles redirects, so this is a fallback.
    return null;
  }

  return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <AppHeader />
            <RoleSwitcherTabs />
            <main className="flex-grow p-6 sm:p-8 lg:p-10 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardWrapper>
        {children}
      </DashboardWrapper>
    </AuthProvider>
  );
}
