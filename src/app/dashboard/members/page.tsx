"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  doc,
  updateDoc,
  runTransaction,
  increment,
} from "firebase/firestore";
import { getColumns } from "@/components/dashboard/members/columns";
import { DataTable } from "@/components/dashboard/members/data-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Search, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RenewPlanDialog } from "@/components/dashboard/members/renew-plan-dialogue";
import {
  TableSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-skeletons";
import type { UserWithPlan, MembershipPlan } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, Calendar, CreditCard, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInitials, getAvatarStyle, capitalizeName } from "@/lib/avatar-utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MembershipStatus = "active" | "pending" | "expired";

interface UserWithMembership extends UserWithPlan {
  planName: string;
  membershipStatus: MembershipStatus;
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

const safeParseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === "string") return new Date(date);
  return null;
};

export default function MembersPage() {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<UserWithMembership | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [mobileStatusFilter, setMobileStatusFilter] = useState<string>("all");
  const MOBILE_PAGE_SIZE = 10;

  const getMembershipStatus = useCallback(
    (historyDocs: any[]): MembershipStatus => {
      if (!historyDocs || historyDocs.length === 0) return "pending";

      const now = new Date();

      // Check if ANY membership period covers today's date
      const hasActiveMembership = historyDocs.some((doc) => {
        const data = doc.data();
        if (!data.membershipStart || !data.membershipEnd) return false;

        const start = new Date(data.membershipStart);
        const end = new Date(data.membershipEnd);

        // Member is active if today is between start and end dates
        return now >= start && now <= end;
      });

      if (hasActiveMembership) return "active";

      // If no active membership, check if there's a future one
      const hasFutureMembership = historyDocs.some((doc) => {
        const data = doc.data();
        if (!data.membershipStart) return false;
        const start = new Date(data.membershipStart);
        return now < start;
      });

      if (hasFutureMembership) return "pending";

      // All memberships have expired
      return "expired";
    },
    []
  );

  const { data: processedData, isLoading: isMembersLoading } = useQuery<
    UserWithMembership[]
  >({
    queryKey: ["processedMembers"],
    queryFn: async () => {
      if (!firestore) return [];
      const usersCollection = collection(firestore, "users");
      // Exclude both admins and trainers from members list
      const q = query(usersCollection, where("role", "==", "member"));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as UserWithPlan)
      );

      return Promise.all(
        usersData.map(async (user) => {
          const historyRef = collection(
            firestore,
            "users",
            user.id,
            "membershipHistory"
          );
          const historySnap = await getDocs(
            query(historyRef, orderBy("createdAt", "desc"))
          );

          // Get membership status by checking ALL history entries
          const membershipStatus = getMembershipStatus(historySnap.docs);

          // Get the latest membership history entry (most recent by createdAt)
          const latestHistory = historySnap.docs[0]?.data();
          
          // For display purposes, find the plan with the latest end date
          // This ensures we show the actual expiry date considering future plans
          const now = new Date();
          const activePlan = historySnap.docs.find((doc) => {
            const data = doc.data();
            if (!data.membershipStart || !data.membershipEnd) return false;
            const start = new Date(data.membershipStart);
            const end = new Date(data.membershipEnd);
            return now >= start && now <= end;
          });

          // Find the plan with the latest expiry date (could be current, future, or past)
          const planWithLatestExpiry = historySnap.docs.reduce(
            (latest, current) => {
              if (!latest) return current;
              const latestData = latest.data();
              const currentData = current.data();
              const latestEnd = new Date(latestData?.membershipEnd || 0);
              const currentEnd = new Date(currentData?.membershipEnd || 0);
              return currentEnd > latestEnd ? current : latest;
            },
            historySnap.docs[0]
          );

          // Use the plan with latest expiry for display
          const displayPlan = planWithLatestExpiry;
          const planData = displayPlan?.data();

          // For start date, use the active plan's start if available, otherwise use latest plan's start
          const activePlanData = activePlan?.data();
          const startDate = safeParseDate(
            activePlanData?.membershipStart || planData?.membershipStart
          );
          const endDate = safeParseDate(planData?.membershipEnd);

          // Update main user document with latest membershipEnd if it's different
          const latestMembershipEnd = planData?.membershipEnd;
          if (latestMembershipEnd && user.membershipEnd !== latestMembershipEnd) {
            // Async update to main user document - don't await to avoid blocking
            updateDoc(doc(firestore, "users", user.id), {
              membershipEnd: latestMembershipEnd,
              membershipStart: planData?.membershipStart || user.membershipStart,
              membershipPlanId: planData?.membershipPlanId || user.membershipPlanId,
            }).catch((error: any) => {
              console.warn('Failed to sync membershipEnd to main user document:', error);
            });
          }

          return {
            ...user,
            planName: planData?.membershipPlan || "N/A",
            membershipStatus,
            membershipStart: startDate?.toISOString() ?? "",
            membershipEnd: endDate?.toISOString() ?? "",
            membershipPlanId: planData?.membershipPlanId || "",
          };
        })
      );
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
  });

  const { data: plansData, isLoading: isPlansLoading } = useQuery<
    MembershipPlan[]
  >({
    queryKey: ["plans"],
    queryFn: async () => {
      if (!firestore) return [];
      const plansCollection = collection(firestore, "membershipPlans");
      const q = query(plansCollection, where("status", "==", "active"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MembershipPlan)
      );
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
  });

  const handlePaymentSubmit = async (
    memberId: string,
    historyId: string,
    amount: number,
    paymentDate: Date
  ) => {
    if (!firestore) return;

    const historyDocRef = doc(
      firestore,
      "users",
      memberId,
      "membershipHistory",
      historyId
    );
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
          const monthKey = format(paymentDate, "yyyy-MM");
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
      queryClient.invalidateQueries({ queryKey: ["processedMembers"] });
      queryClient.invalidateQueries({ queryKey: ["revenueSummary"] });
    } catch (error) {
      console.error("Payment transaction failed: ", error);
    }
  };

  const columns = useMemo(
    () =>
      getColumns(
        setRenewOpen,
        setSelectedMember,
        plansData || [],
        handlePaymentSubmit
      ),
    [plansData]
  );

  useEffect(() => {
    if (processedData !== undefined) {
      setInitialLoading(false);
    }
  }, [processedData]);

  const showSkeleton = initialLoading;

  const handleRenewalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["processedMembers"] });
  };

  const handleRowClick = (member: UserWithMembership) => {
    router.push(`/dashboard/members/view/${member.id}`);
  };

  // Calculate pagination for mobile view (sorted by biometricDeviceId descending - latest first)
  const mobileData = useMemo(() => {
    if (!processedData) return { paginatedMembers: [], totalPages: 0, totalCount: 0 };

    // Apply filters
    let filteredData = [...processedData];

    // Search filter
    if (mobileSearchQuery.trim()) {
      const searchLower = mobileSearchQuery.toLowerCase();
      filteredData = filteredData.filter((member) => {
        const name = (member.name || "").toLowerCase();
        const bioId = (member.biometricDeviceId || "").toLowerCase();
        const email = (member.email || "").toLowerCase();
        const phone = (member.phone || "").toLowerCase();
        return (
          name.includes(searchLower) ||
          bioId.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower)
        );
      });
    }

    // Status filter
    if (mobileStatusFilter !== "all") {
      filteredData = filteredData.filter(
        (member) => member.membershipStatus === mobileStatusFilter
      );
    }

    // Sort by biometricDeviceId descending (latest/highest ID first)
    const sortedData = filteredData.sort((a, b) => {
      const idA = parseInt(a.biometricDeviceId || "0", 10);
      const idB = parseInt(b.biometricDeviceId || "0", 10);
      return idB - idA; // Descending order
    });

    const startIndex = mobilePageIndex * MOBILE_PAGE_SIZE;
    const endIndex = startIndex + MOBILE_PAGE_SIZE;
    const paginatedMembers = sortedData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedData.length / MOBILE_PAGE_SIZE);

    return { paginatedMembers, totalPages, totalCount: sortedData.length };
  }, [processedData, mobilePageIndex, mobileSearchQuery, mobileStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/overview">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Members</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Always show the header - looks more polished */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">
            Members
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Manage all members of V3 Fitness.
          </p>
        </div>
        <Button asChild disabled={showSkeleton} className="w-full sm:w-auto">
          <Link href="/dashboard/members/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>
      </div>

      {/* Show enhanced skeleton or actual data */}
      {showSkeleton ? (
        <TableSkeleton rows={10} />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {/* Mobile Search and Filter */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={mobileSearchQuery}
                    onChange={(e) => {
                      setMobileSearchQuery(e.target.value);
                      setMobilePageIndex(0); // Reset to first page on search
                    }}
                    className="pl-9 pr-9"
                  />
                  {mobileSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => {
                        setMobileSearchQuery("");
                        setMobilePageIndex(0);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <Select
                  value={mobileStatusFilter}
                  onValueChange={(value) => {
                    setMobileStatusFilter(value);
                    setMobilePageIndex(0); // Reset to first page on filter change
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                {/* Active Filters Display */}
                {(mobileSearchQuery || mobileStatusFilter !== "all") && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Active filters:</span>
                    {mobileSearchQuery && (
                      <Badge variant="secondary" className="text-xs">
                        Search: {mobileSearchQuery}
                      </Badge>
                    )}
                    {mobileStatusFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs">
                        Status: {mobileStatusFilter}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs ml-auto"
                      onClick={() => {
                        setMobileSearchQuery("");
                        setMobileStatusFilter("all");
                        setMobilePageIndex(0);
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {mobileData.paginatedMembers && mobileData.paginatedMembers.length > 0 ? (
              mobileData.paginatedMembers.map((member) => {
                const initials = getInitials(member.name);
                const avatarStyle = getAvatarStyle(member.name);
                const displayName = capitalizeName(member.name);

                return (
                  <Card
                    key={member.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleRowClick(member)}
                  >
                    <CardContent className="p-4">
                      {/* Member Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="h-14 w-14 rounded-full flex items-center justify-center font-semibold text-lg shrink-0"
                          style={{
                            ...avatarStyle,
                            minWidth: '56px',
                            minHeight: '56px'
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">
                            {displayName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                member.membershipStatus === "active"
                                  ? "default"
                                  : member.membershipStatus === "expired"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {member.membershipStatus.charAt(0).toUpperCase() +
                                member.membershipStatus.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                    {/* Member Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-4 w-4 shrink-0" />
                        <span className="font-medium">
                          {member.planName || "No Plan"}
                        </span>
                      </div>
                      {member.membershipEnd && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="text-xs">
                            Expires:{" "}
                            {format(
                              new Date(member.membershipEnd),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No members found</p>
                </CardContent>
              </Card>
            )}
            
            {/* Mobile Pagination Controls */}
            {mobileData.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-lg border">
                <div className="text-sm text-muted-foreground">
                  Showing {mobilePageIndex * MOBILE_PAGE_SIZE + 1} to{" "}
                  {Math.min(
                    (mobilePageIndex + 1) * MOBILE_PAGE_SIZE,
                    mobileData.totalCount
                  )}{" "}
                  of {mobileData.totalCount} members
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobilePageIndex(0)}
                    disabled={mobilePageIndex === 0}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobilePageIndex(mobilePageIndex - 1)}
                    disabled={mobilePageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">
                      Page {mobilePageIndex + 1} of {mobileData.totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobilePageIndex(mobilePageIndex + 1)}
                    disabled={mobilePageIndex >= mobileData.totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobilePageIndex(mobileData.totalPages - 1)}
                    disabled={mobilePageIndex >= mobileData.totalPages - 1}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={processedData || []}
              onRowClick={handleRowClick}
            />
          </div>
        </>
      )}
      {/* 
      {selectedMember && plansData && (
        <RenewPlanDialog
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          currentEndDate={selectedMember.membershipEnd}
          availablePlans={plansData}
          open={renewOpen}
          onOpenChange={setRenewOpen}
          onSuccess={handleRenewalSuccess}
        />
      )} */}
      {selectedMember && plansData && (
        <RenewPlanDialog
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          currentEndDate={selectedMember.membershipEnd}
          currentPlanId={selectedMember.membershipPlanId}
          currentPlanPrice={
            plansData.find((p) => p.id === selectedMember.membershipPlanId)
              ?.price
          }
          currentPlanDuration={
            plansData.find((p) => p.id === selectedMember.membershipPlanId)
              ?.durationInDays
          }
          availablePlans={plansData}
          open={renewOpen}
          onOpenChange={setRenewOpen}
          onSuccess={handleRenewalSuccess}
        />
      )}
    </div>
  );
}
