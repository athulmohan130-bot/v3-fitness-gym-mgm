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
import { Bell, LogOut, User, PlusCircle, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export function AppHeader() {
  const { user, logout, loading } = useAuth();
  const [search, setSearch] = useState("");

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
          <Skeleton className="h-9 w-full max-w-md rounded-full" />
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      {/* Left (Search) */}
      <div className="flex items-center gap-3 flex-1">
        <div className="relative w-full max-w-md">
          <Input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-muted/50 border focus-visible:ring-1 focus-visible:ring-primary"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
            />
          </svg>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="/dashboard/members/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>

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