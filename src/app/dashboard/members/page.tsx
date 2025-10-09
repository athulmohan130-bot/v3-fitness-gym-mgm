"use client";
import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { getColumns } from "@/components/dashboard/members/columns";
import { DataTable } from "@/components/dashboard/members/data-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { UserWithPlan, MembershipPlan } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { RenewPlanDialog } from "@/components/dashboard/members/renew-plan-dialogue";

export default function MembersPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"));
  }, [firestore]);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "membershipPlans"));
  }, [firestore]);

  const { data: usersData, isLoading: usersLoading } =
    useCollection<UserWithPlan>(usersQuery);
  const { data: plansData, isLoading: plansLoading } =
    useCollection<MembershipPlan>(plansQuery);

  const data = useMemo(() => {
    if (!usersData || !plansData) return [];
    return usersData.map((user) => ({
      ...user,
      planName:
        plansData.find((p) => p.id === user.membershipPlanId)?.name || "N/A",
    }));
  }, [usersData, plansData]);

  

  const isLoading = usersLoading || plansLoading;

  // ------------------------------
  // Dialog state
  const [renewOpen, setRenewOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] =
    React.useState<UserWithPlan | null>(null);
  // ------------------------------

  const columns = useMemo(
    () => getColumns(setRenewOpen, setSelectedMember, plansData || []),
    [plansData]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Members
          </h1>
          <p className="text-muted-foreground">
            Manage all members of GymFlex.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/members/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data} />
      )}

      {selectedMember && plansData && (
        <RenewPlanDialog
          memberId={selectedMember.id}
          currentEndDate={selectedMember.membershipEnd}
          availablePlans={plansData as MembershipPlan[] }
          open={renewOpen}
          onOpenChange={setRenewOpen}
        />
      )}
    </div>
  );
}
