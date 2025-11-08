"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow, startOfDay, endOfDay, isToday, isYesterday, subDays } from "date-fns";
import {
  Search,
  UserPlus,
  DollarSign,
  UserMinus,
  Edit,
  RefreshCw,
  Snowflake,
  FileText,
  TrendingUp,
  Activity as ActivityIcon,
  RotateCw,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Currency from "@/components/ui/currency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ActivityLogSkeleton } from "@/components/ui/loading-skeletons";

// Helper to safely parse activity timestamp
function parseActivityTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  
  // Handle Firestore Timestamp
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Handle ISO string or number
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date() : date;
}

interface ActivityLog {
  id: string;
  type: "payment" | "member_added" | "member_updated" | "member_deleted" | "membership_renewed" | "membership_frozen" | "plan_created" | "plan_updated";
  userId?: string;
  userName?: string;
  userEmail?: string;
  performedBy: string;
  performedByName?: string;
  description: string;
  amount?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface GymUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

const activityIcons: Record<ActivityLog["type"], any> = {
  payment: DollarSign,
  member_added: UserPlus,
  member_updated: Edit,
  member_deleted: UserMinus,
  membership_renewed: RefreshCw,
  membership_frozen: Snowflake,
  plan_created: FileText,
  plan_updated: TrendingUp,
};

const activityColors: Record<ActivityLog["type"], string> = {
  payment: "text-green-600 bg-green-100 dark:bg-green-950",
  member_added: "text-blue-600 bg-blue-100 dark:bg-blue-950",
  member_updated: "text-amber-600 bg-amber-100 dark:bg-amber-950",
  member_deleted: "text-red-600 bg-red-100 dark:bg-red-950",
  membership_renewed: "text-purple-600 bg-purple-100 dark:bg-purple-950",
  membership_frozen: "text-cyan-600 bg-cyan-100 dark:bg-cyan-950",
  plan_created: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950",
  plan_updated: "text-orange-600 bg-orange-100 dark:bg-orange-950",
};

const activityLabels: Record<ActivityLog["type"], string> = {
  payment: "Payment",
  member_added: "New Member",
  member_updated: "Member Updated",
  member_deleted: "Member Deleted",
  membership_renewed: "Membership Renewed",
  membership_frozen: "Membership Frozen",
  plan_created: "Plan Created",
  plan_updated: "Plan Updated",
};

export function ActivityLog() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "7days" | "30days" | "all" | "custom">("today");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  // Query activity logs with date filtering
  const activityQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    let constraints: any[] = [
      orderBy("timestamp", "desc"),
      limit(200) // Fetch more for client-side pagination
    ];

    // Add date filter
    if (dateFilter === "today") {
      const todayStart = Timestamp.fromDate(startOfDay(new Date()));
      const todayEnd = Timestamp.fromDate(endOfDay(new Date()));
      constraints.unshift(where("timestamp", ">=", todayStart));
      constraints.unshift(where("timestamp", "<=", todayEnd));
    } else if (dateFilter === "yesterday") {
      const yesterday = subDays(new Date(), 1);
      const yesterdayStart = Timestamp.fromDate(startOfDay(yesterday));
      const yesterdayEnd = Timestamp.fromDate(endOfDay(yesterday));
      constraints.unshift(where("timestamp", ">=", yesterdayStart));
      constraints.unshift(where("timestamp", "<=", yesterdayEnd));
    } else if (dateFilter === "7days") {
      const sevenDaysAgo = Timestamp.fromDate(startOfDay(subDays(new Date(), 7)));
      constraints.unshift(where("timestamp", ">=", sevenDaysAgo));
    } else if (dateFilter === "30days") {
      const thirtyDaysAgo = Timestamp.fromDate(startOfDay(subDays(new Date(), 30)));
      constraints.unshift(where("timestamp", ">=", thirtyDaysAgo));
    } else if (dateFilter === "custom" && selectedDate) {
      const customStart = Timestamp.fromDate(startOfDay(selectedDate));
      const customEnd = Timestamp.fromDate(endOfDay(selectedDate));
      constraints.unshift(where("timestamp", ">=", customStart));
      constraints.unshift(where("timestamp", "<=", customEnd));
    }

    return query(
      collection(firestore, "activityLogs"),
      ...constraints
    );
  }, [firestore, dateFilter, selectedDate, refreshKey]);

  const { data: activities, isLoading } = useCollection<ActivityLog>(activityQuery);

  // Query all users for lookup
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users");
  }, [firestore]);

  const { data: users } = useCollection<GymUser>(usersQuery);

  // Create user lookup map
  const userMap = useMemo(() => {
    if (!users) return new Map<string, GymUser>();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (!activities) return [];

    let filtered = [...activities];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(query) ||
        activity.userName?.toLowerCase().includes(query) ||
        activity.userEmail?.toLowerCase().includes(query) ||
        activity.performedByName?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    return filtered;
  }, [activities, searchQuery, filterType]);

  // Paginate activities
  const totalPages = Math.ceil(filteredActivities.length / pageSize);
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, dateFilter, selectedDate]);

  // Get activity stats
  const stats = useMemo(() => {
    if (!activities) return {
      totalActivities: 0,
      payments: 0,
      memberActions: 0,
      planActions: 0,
    };

    return {
      totalActivities: activities.length,
      payments: activities.filter(a => a.type === "payment").length,
      memberActions: activities.filter(a =>
        ["member_added", "member_updated", "member_deleted", "membership_renewed", "membership_frozen"].includes(a.type)
      ).length,
      planActions: activities.filter(a =>
        ["plan_created", "plan_updated"].includes(a.type)
      ).length,
    };
  }, [activities]);

  if (isLoading) {
    return <ActivityLogSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ActivityIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payments</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.memberActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plans</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.planActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl sm:text-2xl">Activity Log</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="shrink-0"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Complete audit trail of all actions across V3 Fitness
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, description, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    All Activities
                  </div>
                </SelectItem>
                <SelectItem value="payment">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    Payments
                  </div>
                </SelectItem>
                <SelectItem value="member_added">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    New Members
                  </div>
                </SelectItem>
                <SelectItem value="member_updated">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    Member Updates
                  </div>
                </SelectItem>
                <SelectItem value="membership_renewed">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    Renewals
                  </div>
                </SelectItem>
                <SelectItem value="membership_frozen">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
                    Freezes
                  </div>
                </SelectItem>
                <SelectItem value="plan_created">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    New Plans
                  </div>
                </SelectItem>
                <SelectItem value="plan_updated">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    Plan Updates
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-[240px] h-10 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-foreground/60 mb-3 pb-3 border-b flex items-center justify-between">
            <span>
              Showing <span className="font-semibold text-foreground">{paginatedActivities.length}</span> of{" "}
              <span className="font-semibold text-foreground">{filteredActivities.length}</span> activities
              {dateFilter !== "all" && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {dateFilter === "today" && "Today"}
                  {dateFilter === "yesterday" && "Yesterday"}
                  {dateFilter === "7days" && "Last 7 Days"}
                  {dateFilter === "30days" && "Last 30 Days"}
                  {dateFilter === "custom" && selectedDate && format(selectedDate, "MMM dd, yyyy")}
                </Badge>
              )}
            </span>
            {totalPages > 1 && (
              <span className="text-xs">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {/* Activity Feed */}
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-foreground/60">
                {searchQuery || filterType !== "all"
                  ? "No activities found matching your filters"
                  : "No activities recorded yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedActivities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const user = activity.userId ? userMap.get(activity.userId) : null;
                const activityDate = parseActivityTimestamp(activity.timestamp);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg border hover:bg-muted/40 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activityColors[activity.type]}`}>
                      <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-medium text-xs">
                            {activityLabels[activity.type]}
                          </Badge>
                          {activity.amount && (
                            <span className="font-semibold text-green-600 dark:text-green-500 text-sm">
                              <Currency value={activity.amount} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-foreground/60" title={format(activityDate, "MMM dd, yyyy · hh:mm a")}>
                          {formatDistanceToNow(activityDate, { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm text-foreground/90 mb-2 leading-snug">{activity.description}</p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-foreground/60">
                        {user && (
                          <Link
                            href={`/dashboard/members/view/${activity.userId}`}
                            className="flex items-center gap-1.5 hover:text-primary transition-colors w-fit"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.profileImageUrl} alt={user.name} />
                              <AvatarFallback className="text-[10px]">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-medium">{user.name}</span>
                          </Link>
                        )}
                        {activity.performedByName && (
                          <span className="truncate">
                            <span className="hidden sm:inline text-foreground/40">• </span>By {activity.performedByName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredActivities.length)} of {filteredActivities.length} results
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
