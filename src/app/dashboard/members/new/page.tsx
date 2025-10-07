
'use client';
import { useMemoFirebase, useFirestore } from '@/firebase';
import { NewMemberForm } from "@/components/dashboard/members/new-member-form";
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { MembershipPlan } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";

export default function NewMemberPage() {
  const firestore = useFirestore();
  
  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'membershipPlans'));
  }, [firestore]);

  const { data: plans, isLoading } = useCollection<MembershipPlan>(plansQuery);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
            </div>
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Add New Member</h1>
          <p className="text-muted-foreground">Fill out the form below to create a new member profile.</p>
        </div>
      <NewMemberForm plans={plans || []} />
    </div>
  );
}
