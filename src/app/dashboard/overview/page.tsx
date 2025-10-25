'use client';

import { AdminDashboard } from "@/components/dashboard/overview/admin-dashboard";
import { TrainerDashboard } from "@/components/dashboard/overview/trainer-dashboard";
import { MemberDashboard } from "@/components/dashboard/overview/member-dashboard";
import { useAuth } from "@/lib/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { GymUser } from "@/lib/types";
import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const Page = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  
  const userRef = useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.id);
  }, [firestore, authUser]);

  const { data: user, isLoading: userLoading } = useDoc<GymUser>(userRef);

  const isLoading = authLoading || userLoading;

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-80" />
          <Skeleton className="col-span-3 h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Welcome Header with Quick Actions */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold font-headline tracking-tight mb-2">
              Welcome back, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Here's what's happening with your gym today.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}
            </p>
          </div>

          {/* Quick Actions - Only for admin */}
          {user.role === 'admin' && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-2">
                <Link href="/dashboard/members/new">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link href="/dashboard/attendance">
                  <Calendar className="h-4 w-4" />
                  Attendance
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link href="/dashboard/billing">
                  <FileText className="h-4 w-4" />
                  Billing
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'trainer' && <TrainerDashboard />}
      {user.role === 'member' && <MemberDashboard user={user} />}
    </div>
  );
};

export default Page;
