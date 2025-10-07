
'use client';
import { EditPlanForm } from "@/components/dashboard/plans/edit-plan-form";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { MembershipPlan } from '@/lib/types';
import { notFound, useParams } from "next/navigation";
import { Skeleton } from '@/components/ui/skeleton';

export default function EditPlanPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  
  const planRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'membershipPlans', id);
  }, [firestore, id]);
  
  const { data: plan, isLoading } = useDoc<MembershipPlan>(planRef);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!plan) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Edit Membership Plan</h1>
          <p className="text-muted-foreground">Modify the details for the <span className="font-semibold">{plan.name}</span> plan.</p>
        </div>
      <EditPlanForm plan={plan} />
    </div>
  );
}
