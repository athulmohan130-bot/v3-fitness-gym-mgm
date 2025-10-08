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
import { Menu, Bell, MessageCircle, LogOut, User, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AppHeader() {
  const { user, logout, loading } = useAuth(); // assuming useAuth exposes loading
  const [search, setSearch] = useState("");

  const getInitials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "U";

  // 🧱 Show skeleton when user or auth is loading
  if (loading || !user) {
    return (
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
        {/* Left Section (Search Skeleton) */}
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-9 w-full max-w-md rounded-full" />
        </div>

        {/* Right Section (Buttons Skeleton) */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-full" /> {/* Add Member */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* Bell */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* Message */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* Theme Toggle */}
          <Skeleton className="h-9 w-9 rounded-full" /> {/* Avatar */}
        </div>
      </header>
    );
  }

  // ✅ Loaded UI
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      
      {/* --- Left Section (Search) --- */}
      <div className="flex items-center gap-3 flex-1">
        <div className="relative w-full max-w-md">
          <Input
            type="text"
            placeholder="Search anything..."
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

      {/* --- Right Section --- */}
      <div className="flex items-center gap-3">
        {/* Create Button */}
        <Button className="rounded-full px-5 font-medium shadow-sm" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Member
        </Button>

        {/* Notification + Messages */}
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/70">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/70">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Theme Toggle */}
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
                <AvatarImage src={user?.profileImageUrl} alt={user?.name || "User"} />
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
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
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