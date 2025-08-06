
"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { AppHeader } from "@/components/app-header";
import { AppSidebar, SidebarProvider } from "@/components/ui/sidebar";

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();

  if (!user) {
    // AuthProvider handles redirects, so this is a fallback.
    return null;
  }

  return (
      <SidebarProvider>
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <AppHeader />
            <main className="p-4 sm:p-6 lg:p-8 flex-grow">{children}</main>
        </div>
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
