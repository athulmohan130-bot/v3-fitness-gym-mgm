
'use client';
import { useMemoFirebase, useFirestore } from '@/firebase';
import { NewMemberForm } from "@/components/dashboard/members/new-member-form";
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { MembershipPlan } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";

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
    <div className="space-y-4 md:space-y-6">
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
            <BreadcrumbLink asChild>
              <Link href="/dashboard/members">Members</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Member</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Add New Member</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Fill out the form below to create a new member profile.</p>
      </div>
      <NewMemberForm plans={plans || []} />
    </div>
  );
}
