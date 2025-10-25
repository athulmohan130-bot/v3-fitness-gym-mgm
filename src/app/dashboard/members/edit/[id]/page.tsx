"use client";
import { EditMemberForm } from "@/components/dashboard/members/edit-member-form";
import {
  useDoc,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from "@/firebase";
import { doc, collection, query, orderBy, getDocs } from "firebase/firestore";
import type { GymUser, MembershipPlan } from "@/lib/types";
import { notFound, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";

export default function EditMemberPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
   const [latestPlan, setLatestPlan] = useState<{
    membershipPlan: string;
    membershipStart?: string;
    membershipEnd?: string;
    // membershipStatus?: "active" | "pending" | "expired";
  } | undefined>(undefined);

  const memberRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "users", id);
  }, [firestore, id]);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "membershipPlans");
  }, [firestore]);

  const { data: member, isLoading: memberLoading } = useDoc<GymUser>(memberRef);
  const { data: plans, isLoading: plansLoading } =
    useCollection<MembershipPlan>(plansQuery);
  useEffect(() => {
    const fetchLatestHistory = async () => {
      if (!firestore || !id) return;

      const historyRef = collection(
        firestore,
        "users",
        id,
        "membershipHistory"
      );
      const q = query(historyRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        const now = new Date();
        const start = new Date(latest.membershipStart);
        const end = new Date(latest.membershipEnd);

        let membershipStatus: "active" | "pending" | "expired" = "pending";
        if (now < start) membershipStatus = "pending";
        else if (now > end) membershipStatus = "expired";
        else membershipStatus = "active";

        setLatestPlan({
          membershipPlan: latest.membershipPlan || "N/A",
          membershipStart: latest.membershipStart,
          membershipEnd: latest.membershipEnd,
          // membershipStatus,
        });
      } else {
        setLatestPlan({
          membershipPlan: "No Plan Found",
        });
      }
    };

    fetchLatestHistory();
  }, [firestore, id]);

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
            <BreadcrumbLink asChild>
              <Link href={`/dashboard/members/view/${id}`}>{member.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Edit Member Profile
        </h1>
        <p className="text-muted-foreground">
          Modify the details for{" "}
          <span className="font-semibold">{member.name}</span>.
        </p>
      </div>
      <EditMemberForm member={member} plans={latestPlan} />
    </div>
  );
}
