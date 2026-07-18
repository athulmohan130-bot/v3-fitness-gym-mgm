import type { UserRole } from "./types";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard/overview",
  trainer: "/dashboard/members",
  member: "/dashboard/overview",
};

// Longest matching prefix decides access; routes not listed are open to all
// authenticated roles. Keep the sidebar/mobile-nav `roles` arrays in sync.
const ROUTE_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/dashboard/overview", roles: ["admin", "member"] },
  { prefix: "/dashboard/members", roles: ["admin", "trainer"] },
  { prefix: "/dashboard/attendance", roles: ["admin", "trainer"] },
  { prefix: "/dashboard/plans", roles: ["admin"] },
  { prefix: "/dashboard/billing", roles: ["admin"] },
  { prefix: "/dashboard/activity", roles: ["admin"] },
  { prefix: "/dashboard/settings", roles: ["admin", "trainer", "member"] },
];

export function roleHome(role: UserRole | undefined): string {
  return (role && ROLE_HOME[role]) || "/dashboard/overview";
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  let match: { prefix: string; roles: UserRole[] } | undefined;
  for (const route of ROUTE_ROLES) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + "/")) {
      if (!match || route.prefix.length > match.prefix.length) {
        match = route;
      }
    }
  }
  return match ? match.roles.includes(role) : true;
}
