import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-secondary/30">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
