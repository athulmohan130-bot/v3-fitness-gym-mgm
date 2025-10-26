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
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
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
} from "lucide-react";
import Link from "next/link";
import Currency from "@/components/ui/currency";

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
  const [displayLimit, setDisplayLimit] = useState(50);
  const [refreshKey, setRefreshKey] = useState(0);

  // Query activity logs
  const activityQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "activityLogs"),
      orderBy("timestamp", "desc"),
      limit(displayLimit)
    );
  }, [firestore, displayLimit, refreshKey]);

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
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ActivityIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{stats.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payments</p>
                <p className="text-2xl font-bold">{stats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Actions</p>
                <p className="text-2xl font-bold">{stats.memberActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan Actions</p>
                <p className="text-2xl font-bold">{stats.planActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Complete audit trail of all actions across V3 Fitness
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="member_added">New Members</SelectItem>
                <SelectItem value="member_updated">Member Updates</SelectItem>
                <SelectItem value="membership_renewed">Renewals</SelectItem>
                <SelectItem value="membership_frozen">Freezes</SelectItem>
                <SelectItem value="plan_created">New Plans</SelectItem>
                <SelectItem value="plan_updated">Plan Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground mb-4">
            Showing <span className="font-semibold text-foreground">{filteredActivities.length}</span> of{" "}
            <span className="font-semibold text-foreground">{activities?.length || 0}</span> activities
          </div>

          {/* Activity Feed */}
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || filterType !== "all"
                  ? "No activities found matching your filters"
                  : "No activities recorded yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const user = activity.userId ? userMap.get(activity.userId) : null;
                const activityDate = parseActivityTimestamp(activity.timestamp);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${activityColors[activity.type]}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-medium">
                            {activityLabels[activity.type]}
                          </Badge>
                          {activity.amount && (
                            <span className="font-semibold text-green-600">
                              <Currency value={activity.amount} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(activityDate, "MMM dd, yyyy · hh:mm a")}
                        </span>
                      </div>

                      <p className="text-sm mb-2">{activity.description}</p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {user && (
                          <Link
                            href={`/dashboard/members/view/${activity.userId}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.profileImageUrl} alt={user.name} />
                              <AvatarFallback className="text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </Link>
                        )}
                        {activity.performedByName && (
                          <span>· Performed by {activity.performedByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More */}
              {activities && activities.length >= displayLimit && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                  >
                    Load More Activities
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
