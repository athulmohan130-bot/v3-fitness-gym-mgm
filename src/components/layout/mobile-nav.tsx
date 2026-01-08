"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  CreditCard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";
import { useNavigationLoading } from "@/hooks/use-navigation-loading";

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
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role || 'member';
  const { isNavigating, targetPath, startNavigation } = useNavigationLoading();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <nav className="grid grid-cols-3 items-center justify-around h-16">
        {mobileMenuItems.map((item) =>
          item.roles.includes(userRole) ? (
            <button
              key={item.href}
              onClick={() => {
                if (pathname !== item.href) {
                  startNavigation(item.href);
                  router.push(item.href);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-opacity",
                pathname.startsWith(item.href) && "text-primary",
                isNavigating && targetPath === item.href && "opacity-70"
              )}
            >
              {isNavigating && targetPath === item.href ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <item.icon className="h-5 w-5" />
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ) : null
        )}
      </nav>
    </div>
  );
}
