"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  Dumbbell,
  CreditCard,
  Settings,
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

const menuItems = [
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
  {
    href: "/dashboard/plans",
    label: "Plans",
    icon: Dumbbell,
    roles: ["admin"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role || 'member';

  return (
    <Sidebar className="hidden lg:flex lg:flex-col lg:border-r">
      <SidebarHeader className="p-4">
        <Link href="/dashboard/overview" className="flex items-center gap-2 font-bold font-headline text-xl">
           <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          <span>GymFlex</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.map((item) =>
            item.roles.includes(userRole) ? (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="ml-2">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ) : null
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
            <SidebarMenuItem>
                 <Link href="/dashboard/settings" passHref>
                  <SidebarMenuButton isActive={pathname === "/dashboard/settings"} className="w-full justify-start">
                    <Settings className="h-5 w-5" />
                    <span className="ml-2">Settings</span>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
