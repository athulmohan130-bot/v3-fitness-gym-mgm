
'use client';
import { ViewMemberDetails } from "@/components/dashboard/members/view-member-details";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { GymUser, MembershipPlan } from "@/lib/types";
import { notFound, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function ViewMemberPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  
  const memberRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'users', id);
  }, [firestore, id]);

  const { data: member, isLoading: memberLoading } = useDoc<GymUser>(memberRef);
  
  const planRef = useMemoFirebase(() => {
    if (!firestore || !member) return null;
    return doc(firestore, 'membershipPlans', member.membershipPlanId);
  }, [firestore, member]);

  const { data: plan, isLoading: planLoading } = useDoc<MembershipPlan>(planRef);

  const isLoading = memberLoading || planLoading;

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-[600px] w-full mt-4" />
        </div>
    );
  }

  if (!member) {
    // If loading is finished and we still have no member, it's a 404.
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
            <h1 className="text-3xl font-bold font-headline tracking-tight">Member Profile</h1>
            <p className="text-muted-foreground">Read-only view of <span className="font-semibold">{member.name}</span>'s details.</p>
          </div>
       </div>
      <ViewMemberDetails member={member} plan={plan} />
    </div>
  );
}
