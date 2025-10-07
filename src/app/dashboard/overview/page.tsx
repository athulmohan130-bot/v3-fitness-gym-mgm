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
      <h1 className="text-3xl font-bold font-headline tracking-tight">
        Welcome back, {user.name.split(' ')[0]}!
      </h1>
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'trainer' && <TrainerDashboard />}
      {user.role === 'member' && <MemberDashboard user={user} />}
    </div>
  );
};

export default Page;
