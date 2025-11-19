// src/app/dashboard/plans/page.tsx
"use client";

import { useMemoFirebase, useCollection, useFirestore } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { MembershipPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Currency from '@/components/ui/currency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlusCircle, Pencil, Home, ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { PlansSkeleton } from "@/components/dashboard/plans/plans-skeleton";
import { useMemo, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "type-asc" | "type-desc" | "duration-asc" | "duration-desc";

export default function PlansPage() {
  const firestore = useFirestore();
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [searchQuery, setSearchQuery] = useState("");

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'membershipPlans'),
      where("status", "in", ["active", "inactive"]) // Include both active and inactive plans
    );
  }, [firestore]);

  const { data: plans, isLoading, error } = useCollection<MembershipPlan>(plansQuery);

  // Sort function
  const sortPlans = (plansToSort: MembershipPlan[]) => {
    return [...plansToSort].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "type-asc":
          return (a.type || "").localeCompare(b.type || "");
        case "type-desc":
          return (b.type || "").localeCompare(a.type || "");
        case "duration-asc":
          return (a.durationInDays || 0) - (b.durationInDays || 0);
        case "duration-desc":
          return (b.durationInDays || 0) - (a.durationInDays || 0);
        default:
          return 0;
      }
    });
  };

  // Filter plans based on search query
  const filterPlans = (plansToFilter: MembershipPlan[]) => {
    if (!searchQuery.trim()) return plansToFilter;
    
    const query = searchQuery.toLowerCase();
    return plansToFilter.filter(plan => 
      (plan.name || "").toLowerCase().includes(query) ||
      (plan.type || "").toLowerCase().includes(query) ||
      plan.features?.some(feature => 
        (feature.value || "").toLowerCase().includes(query)
      )
    );
  };

  // Memoize the filtered and sorted plans to prevent unnecessary re-renders
  const activePlans = useMemo(() => {
    const filtered = plans?.filter(plan => plan.status === 'active') || [];
    const searched = filterPlans(filtered);
    return sortPlans(searched);
  }, [plans, sortBy, searchQuery]);

  const inactivePlans = useMemo(() => {
    const filtered = plans?.filter(plan => plan.status === 'inactive') || [];
    const searched = filterPlans(filtered);
    return sortPlans(searched);
  }, [plans, sortBy, searchQuery]);

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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Field */}
          {plans && plans.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 bg-muted/20 rounded-md border border-muted">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[180px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-1 focus:ring-primary px-1"
              />
            </div>
          )}
          
          {/* Sort Controls */}
          {plans && plans.length > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 bg-muted/20 rounded-md border border-muted">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-1 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                  <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                  <SelectItem value="type-asc">Type (A to Z)</SelectItem>
                  <SelectItem value="type-desc">Type (Z to A)</SelectItem>
                  <SelectItem value="duration-asc">Duration (Short to Long)</SelectItem>
                  <SelectItem value="duration-desc">Duration (Long to Short)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/plans/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Plan
            </Link>
          </Button>
        </div>
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

      {plans?.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No membership plans found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/plans/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Plan
            </Link>
          </Button>
        </div>
      ) : (activePlans.length === 0 && inactivePlans.length === 0 && searchQuery.trim()) ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">No plans match your search</p>
          <p className="text-sm text-muted-foreground">Try searching for a different term or clear your search</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </Button>
        </div>
      ) : null}
    </div>
  );
}