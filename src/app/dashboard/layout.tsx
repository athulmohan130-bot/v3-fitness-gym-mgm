import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavigationLoadingProvider } from "@/hooks/use-navigation-loading";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationLoadingProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-b from-transparent to-background/50">
              <div className="mx-auto max-w-[1600px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </NavigationLoadingProvider>
  );
}
