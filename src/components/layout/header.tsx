"use client";

import { useAuth } from "@/lib/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, PlusCircle, X, Search, Trash2, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/lib/notification-provider";

// Helper function to format timestamp
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Page titles mapping
const pageTitles: Record<string, string> = {
  "/dashboard/overview": "Dashboard",
  "/dashboard/members": "Members",
  "/dashboard/members/new": "Add New Member",
  "/dashboard/attendance": "Attendance",
  "/dashboard/plans": "Membership Plans",
  "/dashboard/billing": "Billing",
  "/dashboard/activity": "Activity Log",
  "/dashboard/settings": "Settings",
};

export function AppHeader() {
  const { user, logout, loading } = useAuth();
  const { notifications, unreadCount, markAsRead, clearNotification, clearAllNotifications } = useNotifications();
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
      {/* Left Side - Menu Button, Page Title & Search */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile Menu Button */}
        <SidebarTrigger className="lg:hidden" />

        {/* Page Title */}
        <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
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
      <div className="flex items-center gap-2 sm:gap-3">
        {!hideMembersControls && (
          <Button asChild className="hidden sm:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all rounded-full px-6">
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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto p-0">
              <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background border-b z-10">
                <DropdownMenuLabel className="p-0 m-0">Notifications</DropdownMenuLabel>
                {notifications.length > 0 && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        notifications.forEach(n => !n.read && markAsRead(n.id));
                      }}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllNotifications();
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`group relative px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notif.read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                            notif.type === "success"
                              ? "bg-green-500"
                              : notif.type === "error"
                              ? "bg-red-500"
                              : notif.type === "warning"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          {notif.title && (
                            <p className="text-sm font-medium mb-1">
                              {notif.title}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground break-words">
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(notif.timestamp)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notif.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
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
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
                <h3 className="text-base font-medium">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => clearAllNotifications()}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileNotifOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div>
                {notifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center p-12">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`group px-4 py-3 ${
                          !notif.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                              notif.type === "success"
                                ? "bg-green-500"
                                : notif.type === "error"
                                ? "bg-red-500"
                                : notif.type === "warning"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            {notif.title && (
                              <p className="text-sm font-medium mb-1">
                                {notif.title}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground break-words">
                              {notif.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(notif.timestamp)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notif.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
