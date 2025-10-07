
'use client';
import { EditMemberForm } from "@/components/dashboard/members/edit-member-form";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { GymUser, MembershipPlan } from "@/lib/types";
import { notFound, useParams } from "next/navigation";
import { Skeleton } from '@/components/ui/skeleton';

export default function EditMemberPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const memberRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'users', id);
  }, [firestore, id]);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'membershipPlans');
  }, [firestore]);

  const { data: member, isLoading: memberLoading } = useDoc<GymUser>(memberRef);
  const { data: plans, isLoading: plansLoading } = useCollection<MembershipPlan>(plansQuery);

  const isLoading = memberLoading || plansLoading;

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

  if (!member || !plans) {
    // If loading is finished and we still have no data, it's a 404.
    notFound();
    return null; // Return null to satisfy TypeScript after calling notFound()
  }

  // Only render the form if we have all the data.
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Edit Member Profile</h1>
          <p className="text-muted-foreground">Modify the details for <span className="font-semibold">{member.name}</span>.</p>
        </div>
      <EditMemberForm member={member} plans={plans} />
    </div>
  );
}
