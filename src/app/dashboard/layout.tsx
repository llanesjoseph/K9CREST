
import { AuthProvider } from "@/components/auth-provider";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen">
          <AppSidebar />
          <SidebarInset>
             <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <SidebarTrigger className="sm:hidden" />
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-secondary/30 pt-0 sm:pt-0">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}

    