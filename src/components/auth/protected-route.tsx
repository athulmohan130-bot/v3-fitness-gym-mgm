"use client";

import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth check is complete
    if (loading) return;

    // If no user after loading complete, redirect to login
    if (!user) {
      // Store the current path to return to after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.setItem('returnUrl', currentPath);
      }
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Show loading screen ONLY while checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-background transition-opacity duration-500 animate-fadeIn">
        {/* Logo / App name */}
        <div className="flex items-center space-x-2 mb-8 scale-100 sm:scale-110 md:scale-125">
          <span className="text-3xl md:text-4xl font-bold text-primary">V3</span>
          <span className="text-3xl md:text-4xl font-bold text-white bg-primary px-2 py-1 rounded">
            Fitness
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-loading-bar" />
        </div>

        {/* Loading text */}
        <p className="mt-6 text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  // If not loading and no user, don't render anything (redirect is happening)
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
