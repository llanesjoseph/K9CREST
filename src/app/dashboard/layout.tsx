
"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
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
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="p-4 sm:p-6 lg:p-8 flex-grow">{children}</main>
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
