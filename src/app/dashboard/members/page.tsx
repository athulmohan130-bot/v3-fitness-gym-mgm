"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { collection, getDocs, orderBy, query, where, doc, runTransaction, increment } from "firebase/firestore";
import { getColumns } from "@/components/dashboard/members/columns";
import { DataTable } from "@/components/dashboard/members/data-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RenewPlanDialog } from "@/components/dashboard/members/renew-plan-dialogue";
import type { UserWithPlan, MembershipPlan } from "@/lib/types";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from "react";
import { format } from "date-fns";

type MembershipStatus = "active" | "pending" | "expired";

interface UserWithMembership extends UserWithPlan {
  planName: string;
  membershipStatus: MembershipStatus;
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

const safeParseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') return new Date(date);
  return null;
};

export default function MembersPage() {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserWithMembership | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const getMembershipStatus = useCallback((startDate?: string, endDate?: string): MembershipStatus => {
    if (!startDate || !endDate) return "pending";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    if (now < start) return "pending";
    if (now > end) return "expired";
    return "active";
  }, []);

  const { data: processedData, isLoading: isMembersLoading } = useQuery<UserWithMembership[]>({ 
    queryKey: ['processedMembers'],
    queryFn: async () => {
      if (!firestore) return [];
      const usersCollection = collection(firestore, "users");
      const q = query(usersCollection, where("role", "!=", "admin"));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserWithPlan));

      return Promise.all(
        usersData.map(async (user) => {
          const historyRef = collection(firestore, "users", user.id, "membershipHistory");
          const historySnap = await getDocs(query(historyRef, orderBy("createdAt", "desc")));
          const latestPlanData = historySnap.docs[0]?.data();
          const startDate = safeParseDate(latestPlanData?.membershipStart);
          const endDate = safeParseDate(latestPlanData?.membershipEnd);

          return {
            ...user,
            planName: latestPlanData?.membershipPlan || "N/A",
            membershipStatus: getMembershipStatus(startDate?.toISOString(), endDate?.toISOString()),
            membershipStart: startDate?.toISOString() ?? '',
            membershipEnd: endDate?.toISOString() ?? '',
          };
        })
      );
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
  });

  const { data: plansData, isLoading: isPlansLoading } = useQuery<MembershipPlan[]>({ 
    queryKey: ['plans'],
    queryFn: async () => {
      if (!firestore) return [];
      const plansCollection = collection(firestore, "membershipPlans");
      const q = query(plansCollection, where("status", "==", "active"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MembershipPlan));
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
  });

  const handlePaymentSubmit = async (memberId: string, historyId: string, amount: number, paymentDate: Date) => {
    if (!firestore) return;

    const historyDocRef = doc(firestore, "users", memberId, "membershipHistory", historyId);
    const revenueSummaryRef = doc(firestore, "stats/revenueSummary");

    try {
      await runTransaction(firestore, async (transaction) => {
        // All reads must come before all writes.
        const revenueSummaryDoc = await transaction.get(revenueSummaryRef);

        // Now, perform all write operations.
        // 1. Update the membership history payment
        transaction.update(historyDocRef, { 
          paidAmount: increment(amount),
          updatedAt: Timestamp.now(),
        });

        // 2. Revenue Summary Write
        if (amount > 0) {
          const monthKey = format(paymentDate, 'yyyy-MM');
          if (!revenueSummaryDoc.exists()) {
            transaction.set(revenueSummaryRef, {
              totalRevenueAllTime: amount,
              monthlyRevenue: { [monthKey]: amount },
              lastUpdated: Timestamp.now(),
            });
          } else {
            transaction.update(revenueSummaryRef, {
              totalRevenueAllTime: increment(amount),
              [`monthlyRevenue.${monthKey}`]: increment(amount),
              lastUpdated: Timestamp.now(),
            });
          }
        }
      });

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['processedMembers'] });
      queryClient.invalidateQueries({ queryKey: ['revenueSummary'] });

    } catch (error) {
      console.error("Payment transaction failed: ", error);
    }
  };

  const columns = useMemo(
    () => getColumns(setRenewOpen, setSelectedMember, plansData || [], handlePaymentSubmit),
    [plansData]
  );

  useEffect(() => {
    if (processedData !== undefined) {
      setInitialLoading(false);
    }
  }, [processedData]);

  const showSkeleton = initialLoading;

  const handleRenewalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['processedMembers'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Members</h1>
          <p className="text-muted-foreground">Manage all members of GymFlex.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/members/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>
      </div>

      {showSkeleton ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <DataTable columns={columns} data={processedData || []} />
      )}

      {selectedMember && plansData && (
        <RenewPlanDialog
          memberId={selectedMember.id}
          currentEndDate={selectedMember.membershipEnd}
          availablePlans={plansData}
          open={renewOpen}
          onOpenChange={setRenewOpen}
          onSuccess={handleRenewalSuccess}
        />
      )}
    </div>
  );
}
