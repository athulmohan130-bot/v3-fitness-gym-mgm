// src/app/dashboard/plans/page.tsx
"use client";

import { useMemoFirebase, useCollection, useFirestore } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { MembershipPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Currency from '@/components/ui/currency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlusCircle, Pencil, Home } from "lucide-react";
import Link from "next/link";
import { PlansSkeleton } from "@/components/dashboard/plans/plans-skeleton";
import { useMemo } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function PlansPage() {
  const firestore = useFirestore();

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'membershipPlans'),
      where("status", "in", ["active", "inactive"]), // Include both active and inactive plans
      orderBy("status"), // Group active plans first
      orderBy("price") // Sort by price within each status group
    );
  }, [firestore]);

  const { data: plans, isLoading, error } = useCollection<MembershipPlan>(plansQuery);

  // Memoize the plans to prevent unnecessary re-renders
  const activePlans = useMemo(() => 
    plans?.filter(plan => plan.status === 'active') || [], 
    [plans]
  );

  const inactivePlans = useMemo(() => 
    plans?.filter(plan => plan.status === 'inactive') || [], 
    [plans]
  );

  if (isLoading) {
    return <PlansSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>Error loading plans. Please try again later.</p>
        </div>
      </div>
    );
  }

  const renderPlanCard = (plan: MembershipPlan) => (
    <Card key={plan.id} className="flex flex-col hover:shadow-md transition-all duration-200 border hover:border-primary/20">
      <CardHeader className="space-y-2.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-bold mb-1.5 line-clamp-2 leading-tight" title={plan.name}>
              {plan.name}
            </CardTitle>
            {plan.type && (
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 h-5 px-2">
                {plan.type}
              </Badge>
            )}
          </div>
          <Badge
            variant={plan.status === 'active' ? 'default' : 'secondary'}
            className={`shrink-0 h-5 text-[10px] px-2 ${plan.status === 'active' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
          >
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </Badge>
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-primary tracking-tight">
              <Currency value={plan.price + (plan.registrationFee || 0)} />
            </span>
            <span className="text-xs text-muted-foreground font-medium">/ {plan.durationInDays} days</span>
          </div>
          <div className="text-xs space-y-1.5 bg-muted/40 rounded-md p-2.5 border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Plan Price:</span>
              <span className="font-semibold text-foreground"><Currency value={plan.price} /></span>
            </div>
            {plan.registrationFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registration Fee:</span>
                <span className="font-semibold text-foreground"><Currency value={plan.registrationFee} /></span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-border">
              <span className="font-semibold text-foreground">Total for New Members:</span>
              <span className="font-bold text-sm text-primary">
                <Currency value={plan.price + (plan.registrationFee || 0)} />
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pt-0 pb-3">
        <p className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Features Included</p>
        <ul className="space-y-1.5">
          {plan.features?.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
              <span className="text-xs leading-relaxed text-foreground/90">{feature.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-3 mt-auto">
        <Button asChild size="sm" className="w-full font-semibold shadow-sm h-8 text-xs">
          <Link href={`/dashboard/plans/edit/${plan.id}`}>
            <Pencil className="mr-1.5 h-3 w-3" />
            Edit Plan
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
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
            <BreadcrumbPage>Plans</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">Membership Plans</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">View and manage membership plans.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/plans/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Plan
          </Link>
        </Button>
      </div>

      {activePlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Active Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activePlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {inactivePlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Inactive Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {inactivePlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {plans?.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No membership plans found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/plans/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}