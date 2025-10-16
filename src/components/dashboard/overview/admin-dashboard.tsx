"use client";

import { useState, useMemo, useEffect } from "react";
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
import { DollarSign, Users, Activity, CreditCard, ArrowUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { doc, getDoc, query, collection, orderBy, limit, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { GymUser } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

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
      const q = query(collection(firestore, "users"), orderBy("joinDate", "desc"), limit(5));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GymUser));
    },
    enabled: !!firestore,
    staleTime: CACHE_TIME,
  });

  // Derive data from the summary documents
  const totalRevenue = revenueSummary?.totalRevenueAllTime || 0;
  const activeSubscriptions = userSummary?.activeMembers || 0;
  const totalMembers = userSummary?.totalMembers || 0;
  const newMembersData = { count: userSummary?.newMembersThisMonth || 0, percentageChange: 0 };

  const availableYears = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return [new Date().getFullYear().toString()];
    const years = new Set(Object.keys(revenueSummary.monthlyRevenue).map(key => key.replace(/\D/g, '').substring(0, 4)));
    return [...years].sort().reverse();
  }, [revenueSummary?.monthlyRevenue]);

  const chartData = useMemo(() => {
    if (!revenueSummary?.monthlyRevenue) return [];
    return Object.entries(revenueSummary.monthlyRevenue)
      .filter(([key]) => key.replace(/\D/g, '').startsWith(selectedYear))
      .map(([key, value]) => ({
        name: new Date(key).toLocaleString('default', { month: 'short' }),
        total: value,
      }));
  }, [revenueSummary, selectedYear]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const isLoading = userSummaryLoading || revenueLoading || recentUsersLoading;

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
            <div className="text-2xl font-bold">₹{(totalRevenue || 0).toLocaleString()}</div>
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newMembersData?.count || 0}</div>
            {newMembersData?.percentageChange !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center">
                <ArrowUp className={`h-4 w-4 mr-1 ${newMembersData.percentageChange >= 0 ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
                {newMembersData.percentageChange.toFixed(1)}% from last month
              </p>
            )}
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
                {availableYears.map((year: string) => (
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