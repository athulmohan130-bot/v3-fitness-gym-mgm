"use client";

import { useState, useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
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
import { DollarSign, Users, Activity, CreditCard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit, orderBy, doc } from "firebase/firestore";
import type { GymUser, MembershipPlan, UserSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function AdminDashboard() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const recentUsersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), orderBy("joinDate", "desc"), limit(5));
  }, [firestore]);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "membershipPlans"));
  }, [firestore]);

  const paymentStatsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "stats/paymentsSummary/months"));
  }, [firestore]);

  const userSummaryRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "stats/userSummary");
  }, [firestore]);

  const { data: recentUsersData, isLoading: recentUsersLoading } = useCollection<GymUser>(recentUsersQuery);
  const { data: plansData, isLoading: plansLoading } = useCollection<MembershipPlan>(plansQuery);
  const { data: paymentStatsData, isLoading: paymentStatsLoading } = useCollection<any>(paymentStatsQuery);
  const { data: userSummaryData, isLoading: userSummaryLoading } = useDoc<UserSummary>(userSummaryRef);

  const availableYears = useMemo(() => {
    if (!paymentStatsData) return [new Date().getFullYear().toString()];
    const years = new Set(paymentStatsData.map(stat => stat.id.split('-')[0]));
    return [...years].sort().reverse();
  }, [paymentStatsData]);

  const chartData = useMemo(() => {
    if (!paymentStatsData) return [];
    return Object.values(paymentStatsData)
      .filter((stat: any) => stat.id.startsWith(selectedYear))
      .map((stat: any) => ({
        name: new Date(stat.id).toLocaleString('default', { month: 'short' }),
        total: stat.totalReceived,
      }));
  }, [paymentStatsData, selectedYear]);

  const totalRevenue = useMemo(() => {
    if (!paymentStatsData) return 0;
    return paymentStatsData.reduce((acc: number, curr: any) => acc + curr.totalReceived, 0);
  }, [paymentStatsData]);

  const activeSubscriptions = userSummaryData?.activeMembers || 0;
  const totalMembers = userSummaryData?.totalMembers || 0;

  const isLoading = recentUsersLoading || plansLoading || paymentStatsLoading || userSummaryLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>

        {/* Chart + Recent Members skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart Section */}
          <Card className="col-span-4 p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <Skeleton className="h-[350px] w-full rounded-lg" />
          </Card>

          {/* Recent Members Section */}
          <Card className="col-span-4 lg:col-span-3 p-4 space-y-4">
            <div>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3 mt-1" />
            </div>
            <div className="space-y-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="ml-4 space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ---- ACTUAL DASHBOARD ----
  return (
    <div className="space-y-6">
      {/* Top metrics cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">out of {totalMembers} members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Members</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+...</div>
            <p className="text-xs text-muted-foreground">this month (coming soon)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Check-ins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">...</div>
            <p className="text-xs text-muted-foreground">(coming soon)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Members */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monthly Revenue ({selectedYear})</CardTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={value => `₹${Number(value) / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Members</CardTitle>
            <CardDescription>The newest members who have joined.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentUsersData && recentUsersData.length > 0 ? (
                recentUsersData.map(user => (
                  <div key={user.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.profileImageUrl} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="ml-auto font-medium">
                      {format(new Date(user.joinDate), "dd MMM, yyyy")}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No recent members found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}