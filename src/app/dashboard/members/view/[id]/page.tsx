"use client";
import { ViewMemberDetails } from "@/components/dashboard/members/view-member-details";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import type { GymUser, MembershipPlan } from "@/lib/types";
import { notFound, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { differenceInDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getStorage, ref, deleteObject } from "firebase/storage";

export default function ViewMemberPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  const storage = getStorage();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedHistoryForPayment, setSelectedHistoryForPayment] = useState<any>(null);
  const queryClient = useQueryClient();

  const memberRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "users", id);
  }, [firestore, id]);

  const { data: member, isLoading: memberLoading } = useDoc<GymUser>(memberRef);

  const { data: membershipHistory, isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ['membershipHistory', id],
    queryFn: async () => {
      if (!firestore || !id) return [];
      const historyRef = collection(firestore, "users", id, "membershipHistory");
      const historyQuery = query(historyRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(historyQuery);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!firestore && !!id,
  });

  const latestMembership = membershipHistory?.[0] || null;

  const handlePaymentUpdate = async (historyId: string, amount: number) => {
    if (!firestore || !id) return;

    const historyDocRef = doc(firestore, "users", id, "membershipHistory", historyId);
    const revenueSummaryRef = doc(firestore, "stats/revenueSummary");

    try {
      await runTransaction(firestore, async (transaction) => {
        const revenueSummaryDoc = await transaction.get(revenueSummaryRef);

        transaction.update(historyDocRef, { 
          paidAmount: increment(amount),
          updatedAt: new Date(),
        });

        if (amount > 0) {
          const monthKey = format(new Date(), 'yyyy-MM');
          if (!revenueSummaryDoc.exists()) {
            transaction.set(revenueSummaryRef, {
              totalRevenueAllTime: amount,
              monthlyRevenue: { [monthKey]: amount },
              lastUpdated: new Date(),
            });
          } else {
            transaction.update(revenueSummaryRef, {
              totalRevenueAllTime: increment(amount),
              [`monthlyRevenue.${monthKey}`]: increment(amount),
              lastUpdated: new Date(),
            });
          }
        }
      });

      toast({ title: "Success", description: "Payment updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['membershipHistory', id] });
      queryClient.invalidateQueries({ queryKey: ["revenueSummary"] });
      setPaymentOpen(false); // Close the payment dialog

    } catch (error) {
      console.error("Payment transaction failed: ", error);
      toast({ title: "Error", description: "Failed to update payment.", variant: "destructive" });
    }
  };

  const handleFreezeSubmit = async (
    planId: string,
    freezeStart: Date,
    freezeEnd: Date
  ) => {
    if (!firestore || !id || !membershipHistory) return;
    const planRef = doc(firestore, "users", id, "membershipHistory", planId);
    const freezeDuration = differenceInDays(freezeEnd, freezeStart) + 1;
    const planToFreeze = membershipHistory.find((p: any) => p.id === planId);

    if (!planToFreeze) return;

    await updateDoc(planRef, {
      membershipEnd: new Date(
        new Date(planToFreeze.membershipEnd).getTime() +
          freezeDuration * 24 * 60 * 60 * 1000
      ).toISOString(),
      freezeHistory: arrayUnion({
        freezeStart,
        freezeEnd,
        freezeDuration,
      }),
    });

    queryClient.invalidateQueries({ queryKey: ['membershipHistory', id] });
  };

  const handleDeletePlan = async () => {
    if (!firestore || !id || !planToDelete || !membershipHistory) return;

    const planRef = doc(firestore, "users", id, "membershipHistory", planToDelete);
    const userSummaryRef = doc(firestore, "stats/userSummary");

    try {
      await runTransaction(firestore, async (transaction) => {
        const summaryDoc = await transaction.get(userSummaryRef);
        if (!summaryDoc.exists()) return;

        transaction.delete(planRef);

        const isLastPlan = membershipHistory.length === 1;
        if (isLastPlan) {
          const userRef = doc(firestore, "users", id);
          transaction.update(userRef, {
            membershipStatus: "expired",
            membershipPlanId: null,
            membershipStart: null,
            membershipEnd: null,
          });
        }

        const summaryData = summaryDoc.data();
        const updates: { [key: string]: any } = {};

        if (summaryData.totalMembers > 0) {
          updates.totalMembers = increment(-1);
        }
        if (member?.membershipStatus === 'active' && summaryData.activeMembers > 0) {
          updates.activeMembers = increment(-1);
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(userSummaryRef, updates);
        }
      });

      // After successful deletion from Firestore, delete profile picture from Storage
      if (member?.profileImageUrl && !member.profileImageUrl.includes("picsum.photos")) {
        try {
          const imageRef = ref(storage, member.profileImageUrl);
          await deleteObject(imageRef);
        } catch (error: any) {
          if (error.code !== 'storage/object-not-found') {
            console.warn("Could not delete profile image:", error);
          }
        }
      }

      toast({
        title: "Success",
        description: "Membership history deleted successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['membershipHistory', id] });
      queryClient.invalidateQueries({ queryKey: ["userSummary"] });

    } catch (error) {
      console.error("Error deleting plan history:", error);
      toast({
        title: "Error",
        description: "Failed to delete plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const openDeleteDialog = (planId: string) => {
    setPlanToDelete(planId);
    setIsDeleteDialogOpen(true);
  };

  // const planRef = useMemoFirebase(() => {
  //   if (!firestore || !member) return null;
  //   return doc(firestore, "membershipPlans", member.membershipPlanId);
  // }, [firestore, member]);

  // const { data: plan, isLoading: planLoading } =
  //   useDoc<MembershipPlan>(planRef);

  if (memberLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    notFound();
    return null;
  }

  // Only render the details if we have the member data.
  // The 'plan' can be optional, so we don't need to gate rendering on it.
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/members">
            <ArrowLeft />
            <span className="sr-only">Back to members</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Member Profile
          </h1>
          <p className="text-muted-foreground">
            Read-only view of{" "}
            <span className="font-semibold">{member.name}</span>'s details.
          </p>
        </div>
      </div>
      <ViewMemberDetails
        member={member}
        plan={latestMembership}
        availablePlans={membershipHistory || []}
        onPaymentSubmit={handlePaymentUpdate}
        onFreezeSubmit={handleFreezeSubmit}
        onHandleDelete={openDeleteDialog}
        paymentOpen={paymentOpen}
        setPaymentOpen={setPaymentOpen}
        selectedHistoryForPayment={selectedHistoryForPayment}
        setSelectedHistoryForPayment={setSelectedHistoryForPayment}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this plan history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
