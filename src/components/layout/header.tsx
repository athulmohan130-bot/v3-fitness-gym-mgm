"use client";

import { useAuth } from "@/lib/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, PlusCircle, X, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Page titles mapping
const pageTitles: Record<string, string> = {
  "/dashboard/overview": "Dashboard",
  "/dashboard/members": "Members",
  "/dashboard/members/new": "Add New Member",
  "/dashboard/attendance": "Attendance",
  "/dashboard/plans": "Membership Plans",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

export function AppHeader() {
  const { user, logout, loading } = useAuth();
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const hideMembersControls = pathname.startsWith("/dashboard/members");

  // Get page title
  const getPageTitle = () => {
    // Check exact match first
    if (pageTitles[pathname]) return pageTitles[pathname];

    // Check if it's a member view/edit page
    if (pathname.match(/^\/dashboard\/members\/view\/[^/]+$/)) return "Member Details";
    if (pathname.match(/^\/dashboard\/members\/edit\/[^/]+$/)) return "Edit Member";

    // Default
    return "Dashboard";
  };

  // Example notifications (replace with your API/Firestore)
  const [notifications] = useState([
    { id: 1, message: "New member added successfully." },
    { id: 2, message: "Your subscription will expire in 3 days." },
  ]);

  const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);

  // body scroll lock + close on Escape for mobile panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMobileNotifOpen(false);
    }

    if (isMobileNotifOpen) {
      document.body.classList.add("overflow-hidden");
      window.addEventListener("keydown", onKey);
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobileNotifOpen]);

  const getInitials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "U";

  // Loading skeleton
  if (loading || !user) {
    return (
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-1">
          {!hideMembersControls && (
            <Skeleton className="h-9 w-full max-w-md rounded-full" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      {/* Left Side - Page Title & Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Page Title */}
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {getPageTitle()}
        </h1>

        {/* Compact Search - Only on members pages */}
        {!hideMembersControls && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px] lg:w-[300px] h-9 rounded-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {!hideMembersControls && (
          <Button asChild className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all rounded-full px-6">
            <Link href="/dashboard/members/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Member
            </Link>
          </Button>
        )}

        {/* ---------- Desktop dropdown (sm and up) ---------- */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full hover:bg-muted/70"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No new notifications
                </div>
              ) : (
                notifications.map((note) => (
                  <DropdownMenuItem
                    key={note.id}
                    className="text-sm py-2 whitespace-normal"
                  >
                    {note.message}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ---------- Mobile button (sm:hidden) ---------- */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            onClick={() => setIsMobileNotifOpen(true)}
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
        </div>

        {/* Mobile panel / sheet */}
        {isMobileNotifOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setIsMobileNotifOpen(false)}
              aria-hidden
            />

            {/* Panel */}
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-x-0 top-0 z-50 max-h-[90vh] overflow-auto bg-background border-b border-border shadow-lg"
            >
              <div className="flex items-center justify-between p-4">
                <h3 className="text-sm font-medium">Notifications</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileNotifOpen(false)}
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4">
                {notifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center p-6">
                    No new notifications
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border rounded-md overflow-hidden">
                    {notifications.map((note) => (
                      <div
                        key={note.id}
                        className="px-4 py-3 text-sm whitespace-normal"
                      >
                        {note.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <ThemeToggle />

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full hover:ring-2 hover:ring-primary/30 transition"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.profileImageUrl}
                  alt={user?.name || "User"}
                />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
