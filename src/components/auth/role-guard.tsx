"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import { canAccessRoute, roleHome } from "@/lib/route-access";

/**
 * Redirects users away from dashboard routes their role may not access.
 * Must be rendered inside ProtectedRoute (assumes auth state is resolved).
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const allowed = loading || !user || canAccessRoute(user.role, pathname);

  useEffect(() => {
    if (!loading && user && !allowed) {
      router.replace(roleHome(user.role));
    }
  }, [allowed, loading, user, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
