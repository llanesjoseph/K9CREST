
"use client";

import { AuthProvider, useAuth } from "@/components/auth-provider";
import { AppHeader } from "@/components/app-header";

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();

  if (!user) {
    // AuthProvider handles redirects, so this is a fallback.
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
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
