import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { NavigationLoadingProvider } from "@/hooks/use-navigation-loading";
import { NotificationProvider } from "@/lib/notification-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <NavigationLoadingProvider>
        <NotificationProvider>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset className="bg-gradient-to-br from-background via-background to-muted/20">
              <div className="flex flex-1 flex-col min-h-screen">
                <AppHeader />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-b from-transparent to-background/50">
                  <div className="mx-auto max-w-[1600px]">
                    {children}
                  </div>
                </main>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </NotificationProvider>
      </NavigationLoadingProvider>
    </ProtectedRoute>
  );
}
