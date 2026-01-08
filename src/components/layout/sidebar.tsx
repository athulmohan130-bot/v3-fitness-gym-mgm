"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Dumbbell,
  Settings,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-provider";
import { useNavigationLoading } from "@/hooks/use-navigation-loading";

const menuGroups = [
  {
    title: "Main",
    items: [
      {
        href: "/dashboard/overview",
        label: "Overview",
        icon: LayoutDashboard,
        roles: ["admin", "trainer", "member"],
      },
      {
        href: "/dashboard/members",
        label: "Members",
        icon: Users,
        roles: ["admin", "trainer"],
      },
      {
        href: "/dashboard/attendance",
        label: "Attendance",
        icon: HeartPulse,
        roles: ["admin", "trainer"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        href: "/dashboard/plans",
        label: "Plans",
        icon: Dumbbell,
        roles: ["admin"],
      },
      {
        href: "/dashboard/billing",
        label: "Billing",
        icon: Wallet,
        roles: ["admin"],
      },
      {
        href: "/dashboard/activity",
        label: "Activity Log",
        icon: Activity,
        roles: ["admin", "trainer"],
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        roles: ["admin", "trainer", "member"],
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const userRole = user?.role || "member";
  const { state, toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { isNavigating, targetPath, startNavigation } = useNavigationLoading();

  // Close mobile sidebar when navigation is complete
  useEffect(() => {
    if (!isNavigating && isMobile) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setOpenMobile(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, isMobile, setOpenMobile]);

  return (
    <Sidebar
      collapsible="icon"
      className="hidden lg:flex lg:flex-col bg-card/50 backdrop-blur-sm text-foreground border-r border-border/50 font-sans shadow-sm"
    >
      {/* --- Header --- */}
      {/* --- Header --- */}
      {/* --- Header --- */}
      {/* --- Header --- */}
      <SidebarHeader className="p-4 w-full">
        <Link
          href="/dashboard/overview"
          className={`flex items-center font-bold font-headline text-xl transition-all duration-300 ease-in-out ${collapsed ? "justify-center" : "justify-start"
            }`}
        >
          {/* Logo Wrapper */}
          <div
            className={`flex items-center justify-center transition-all duration-300 ${collapsed ? "" : "mr-2"
              }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              className="h-6 w-6 text-primary shrink-0"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Logo Text */}
          <span
            className={`whitespace-nowrap transition-all duration-300 ease-in-out transform origin-left font-semibold text-lg ${collapsed
                ? "opacity-0 scale-95 w-0 overflow-hidden"
                : "opacity-100 scale-100 w-auto"
              }`}
          >
            V3 Fitness
          </span>
        </Link>
      </SidebarHeader>
      {/* --- Menu --- */}
      <SidebarContent className="flex-1 px-2 py-3 overflow-y-auto">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole)
          );
          if (!visibleItems.length) return null;

          return (
            <SidebarMenu key={group.title} className="mb-4">
              {!collapsed && (
                <p className="px-3 mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  {group.title}
                </p>
              )}
              {visibleItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const isLoading = isNavigating && targetPath === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      disabled={isLoading}
                      onClick={() => {
                        if (pathname !== item.href) {
                          startNavigation(item.href);
                          router.push(item.href);
                        }
                      }}
                      className={`w-full flex items-center rounded-xl px-3 py-2.5 transition-all duration-200 group cursor-pointer
                      ${active
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }
                      ${isLoading ? "opacity-70 cursor-wait" : ""}`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                        />
                      )}
                      {!collapsed && (
                        <span className="ml-2">{item.label}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          );
        })}
      </SidebarContent>

      {/* --- Footer (Collapse + Logout) --- */}
      <SidebarFooter className="border-t border-border px-3 py-3 w-full">
        <div
          className={`flex items-center ${collapsed ? "flex-col gap-2 justify-center" : "flex-row justify-between"
            }`}
        >
          {/* Logout Button */}
          <button
            onClick={logout}
            className={`flex items-center gap-2 rounded-lg transition-all duration-200
        text-destructive hover:bg-destructive/10 hover:text-destructive
        ${collapsed ? "w-10 h-10 justify-center p-2" : "px-3 py-2 w-full justify-start"}`}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>

          {/* Collapse Button */}
          <button
            onClick={toggleSidebar}
            className={`flex items-center justify-center rounded-lg transition-colors
        hover:bg-muted text-muted-foreground hover:text-foreground
        ${collapsed ? "w-10 h-10 p-2" : "w-10 h-10 p-2 ml-2"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
