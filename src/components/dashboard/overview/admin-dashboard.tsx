"use client";

import { useState, useMemo, useEffect } from "react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, Area, AreaChart, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Users, Activity, CreditCard, ArrowUp, TrendingUp, UserPlus, TrendingDown, Plus, FileText, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { doc, getDoc, query, collection, orderBy, limit, getDocs } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { GymUser } from "@/lib/types";
import { StatsGridSkeleton, ChartSkeleton, CompactListSkeleton } from "@/components/ui/loading-skeletons";
import { useQuery } from "@tanstack/react-query";
import Currency from '@/components/ui/currency';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Define types for your summary documents
interface UserSummary {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
}

interface RevenueSummary {
  totalRevenueAllTime: number;
  monthlyRevenue: { [key: string]: number };
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

export function AdminDashboard() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const { data: userSummary, isLoading: userSummaryLoading } = useQuery<UserSummary | null>({
    queryKey: ['userSummary'],
    queryFn: async () => {
      if (!firestore) return null;
      const docRef = doc(firestore, 'stats/userSummary');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as UserSummary : null;
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
  });

  const { data: revenueSummary, isLoading: revenueLoading } = useQuery<RevenueSummary | null>({
    queryKey: ['revenueSummary'],
    queryFn: async () => {
      if (!firestore) return null;
      const docRef = doc(firestore, 'stats/revenueSummary');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as RevenueSummary : null;
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
  });

  const { data: recentUsersData, isLoading: recentUsersLoading } = useQuery<GymUser[]> ({
    queryKey: ['recentUsersDashboard'],
    queryFn: async () => {
      if (!firestore) return [];
      const q = query(collection(firestore, "users"), orderBy("joinDate", "desc"), limit(8));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GymUser));
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
  });

  // Calculate current month revenue and trends
  const monthlyRevenueData = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return { current: 0, previous: 0, change: 0, changeAmount: 0, isPositive: true };

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const currentRevenue = revenueSummary.monthlyRevenue[currentMonthKey] || 0;
    const lastRevenue = revenueSummary.monthlyRevenue[lastMonthKey] || 0;

    if (lastRevenue === 0 && currentRevenue === 0) {
      return { current: 0, previous: 0, change: 0, changeAmount: 0, isPositive: true };
    }

    if (lastRevenue === 0) {
      return { current: currentRevenue, previous: 0, change: 0, changeAmount: currentRevenue, isPositive: true };
    }

    const percentChange = ((currentRevenue - lastRevenue) / lastRevenue) * 100;
    return {
      current: currentRevenue,
      previous: lastRevenue,
      change: Math.round(percentChange),
      changeAmount: currentRevenue - lastRevenue,
      isPositive: percentChange >= 0
    };
  }, [revenueSummary]);

  // Derive data from the summary documents
  const activeSubscriptions = userSummary?.activeMembers || 0;
  const totalMembers = userSummary?.totalMembers || 0;
  const inactiveMembers = totalMembers - activeSubscriptions;
  const newMembersData = { count: userSummary?.newMembersThisMonth || 0, percentageChange: 0 };

  // Calculate first month for launch context
  const launchMonth = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return null;
    const months = Object.keys(revenueSummary.monthlyRevenue).sort();
    return months[0] ? format(new Date(months[0]), "MMM yyyy") : null;
  }, [revenueSummary]);

  const availableYears = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return [new Date().getFullYear().toString()];
    const years = new Set(Object.keys(revenueSummary.monthlyRevenue).map(key => key.replace(/\D/g, '').substring(0, 4)));
    return [...years].sort().reverse();
  }, [revenueSummary?.monthlyRevenue]);

  const chartData = useMemo(() => {
    // Always generate last 6 months from current date
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });

      // Get revenue from Firebase data, default to 0 if not found
      const revenue = revenueSummary?.monthlyRevenue?.[monthKey] || 0;

      months.push({
        name: monthName,
        total: revenue,
        month: monthKey,
      });
    }

    return months;
  }, [revenueSummary]);

  // Check if we have multiple months of data for meaningful trends
  const hasMultipleMonths = chartData.length > 1;

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Sparkline data for revenue trend (last 6 months) - MUST be before any early returns
  const revenueSparklineData = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return [];
    const entries = Object.entries(revenueSummary.monthlyRevenue)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-6);
    return entries.map(([_, value]) => ({ value }));
  }, [revenueSummary]);

  const isLoading = userSummaryLoading || revenueLoading || recentUsersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <StatsGridSkeleton count={4} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <ChartSkeleton />
          </div>

          <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardHeader>
            <CardContent>
              <CompactListSkeleton items={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- ACTUAL DASHBOARD ----
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top metrics cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* This Month Revenue - Green */}
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-xl transition-shadow group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Revenue</CardTitle>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold tracking-tight"><Currency value={monthlyRevenueData.current} /></div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'MMMM yyyy')}
                {launchMonth && <span className="ml-1">• Since {launchMonth}</span>}
              </p>
              {monthlyRevenueData.previous > 0 && (
                <div className="flex items-center gap-1.5">
                  {monthlyRevenueData.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-sm font-semibold",
                    monthlyRevenueData.isPositive ? "text-emerald-600" : "text-red-500"
                  )}>
                    <Currency value={Math.abs(monthlyRevenueData.changeAmount)} /> ({monthlyRevenueData.change}%)
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Status - Blue/Amber */}
        <Card className={cn(
          "border-l-4 hover:shadow-xl transition-shadow group overflow-hidden relative",
          inactiveMembers > 0 ? "border-l-amber-500" : "border-l-blue-500"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300",
            inactiveMembers > 0 ? "bg-amber-500/5" : "bg-blue-500/5"
          )} />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Member Status</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              inactiveMembers > 0 ? "bg-amber-500/10" : "bg-blue-500/10"
            )}>
              <Users className={cn("h-5 w-5", inactiveMembers > 0 ? "text-amber-600" : "text-blue-600")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tight">{activeSubscriptions}</div>
              <span className="text-lg text-muted-foreground">/ {totalMembers}</span>
            </div>
            <div className="space-y-1.5">
              {inactiveMembers > 0 ? (
                <>
                  <p className="text-sm text-amber-600 font-medium">
                    ⚠ {inactiveMembers} inactive member{inactiveMembers > 1 ? 's' : ''} need{inactiveMembers === 1 ? 's' : ''} attention
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((activeSubscriptions / totalMembers) * 100)}% active
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-emerald-600 font-medium">
                    ✓ All members active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    100% retention
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* New Members This Month - Purple */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tight">+{newMembersData.count}</div>
              <span className="text-lg text-muted-foreground">members</span>
            </div>
            <div className="space-y-1.5">
              {launchMonth === format(new Date(), 'MMM yyyy') ? (
                <p className="text-sm text-purple-600 font-medium">
                  First month signups
                </p>
              ) : totalMembers > 0 && newMembersData.count > 0 ? (
                <p className="text-sm text-purple-600 font-medium">
                  {Math.round((newMembersData.count / totalMembers) * 100)}% of total base
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No new members this month
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'MMMM yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Members */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Revenue Trend</CardTitle>
              <CardDescription className="mt-1.5 text-xs sm:text-sm">
                Last 6 months revenue overview
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-0 sm:pl-2 pr-2 sm:pr-4 pb-6">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={value => {
                    if (value === 0) return '₹0';
                    // Always use comma formatting for consistency - no mixing formats
                    return `₹${value.toLocaleString('en-IN')}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    marginBottom: "4px",
                    color: "hsl(var(--foreground))"
                  }}
                  formatter={(value: number) => {
                    const formatted = new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(value);
                    return [formatted, "Revenue"];
                  }}
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "5 5" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Members - Better background and spacing */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                Recent Members
                <span className="text-xs font-semibold text-primary bg-primary/15 px-2.5 py-1 rounded-md border border-primary/20">
                  {recentUsersData?.length || 0}
                </span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/dashboard/members">View All {totalMembers} →</Link>
              </Button>
            </div>
            <CardDescription className="mt-2">
              {recentUsersData && recentUsersData.length < totalMembers
                ? `Showing ${recentUsersData.length} most recent of ${totalMembers} total members`
                : `All ${totalMembers} member${totalMembers !== 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsersData && recentUsersData.length > 0 ? (
                recentUsersData.map((user, index) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg hover:bg-background/80 transition-colors cursor-pointer",
                      index < recentUsersData.length - 1 && "border-b border-border/50 pb-4"
                    )}
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src={user.profileImageUrl} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(user.joinDate), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No recent members found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}