"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Dumbbell,
  Settings,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
        icon: CreditCard,
        roles: ["admin"],
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
  const [collapsed, setCollapsed] = useState(false);
  const { isNavigating, targetPath, startNavigation } = useNavigationLoading();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname !== href) {
      e.preventDefault();
      startNavigation(href);
      router.push(href);
    }
  };

  return (
    <Sidebar
      className={`hidden lg:flex lg:flex-col bg-card/50 backdrop-blur-sm text-foreground border-r border-border/50 font-sans shadow-sm
      transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* --- Header --- */}
      {/* --- Header --- */}
{/* --- Header --- */}
{/* --- Header --- */}
<SidebarHeader className="p-4 w-full">
  <Link
    href="/dashboard/overview"
    className={`flex items-center font-bold font-headline text-xl transition-all duration-300 ease-in-out ${
      collapsed ? "justify-center" : "justify-start"
    }`}
  >
    {/* Logo Wrapper */}
    <div
      className={`flex items-center justify-center transition-all duration-300 ${
        collapsed ? "" : "mr-2"
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
      className={`transition-all duration-300 ease-in-out transform origin-left ${
        collapsed
          ? "opacity-0 scale-95 w-0 overflow-hidden"
          : "opacity-100 scale-100 w-auto"
      }`}
    >
      V3Fitness
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
                    <Link href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                      <SidebarMenuButton
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        disabled={isLoading}
                        className={`w-full flex items-center rounded-xl px-3 py-2.5 transition-all duration-200 group
                        ${
                          active
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }
                        ${isLoading ? "opacity-70 cursor-wait" : ""}`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <item.icon
                            className={`h-5 w-5 shrink-0 ${
                              active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                        )}
                        {!collapsed && (
                          <span className="ml-2">{item.label}</span>
                        )}
                      </SidebarMenuButton>
                    </Link>
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
          className={`flex items-center justify-between ${
            collapsed ? "flex-col gap-2" : "flex-row"
          }`}
        >
          {/* Logout Button */}
          <button
            onClick={logout}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 w-full justify-start 
        text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200`}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors
        ${collapsed ? "w-8 h-8" : "ml-2"}
        hover:bg-muted text-muted-foreground hover:text-foreground`}
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
