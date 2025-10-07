"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";

const mobileMenuItems = [
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
    label: "Check-in",
    icon: HeartPulse,
    roles: ["admin", "trainer"],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role || 'member';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <nav className="grid grid-cols-3 items-center justify-around h-16">
        {mobileMenuItems.map((item) =>
          item.roles.includes(userRole) ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary",
                pathname.startsWith(item.href) && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ) : null
        )}
      </nav>
    </div>
  );
}
