"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MemberCardGridSkeleton, SearchBarSkeleton } from "@/components/ui/loading-skeletons";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { format, differenceInDays } from "date-fns";
import { useGymSettings } from "@/hooks/use-gym-settings";
import { Search, Users, Volume2, VolumeX, Settings, Home, Grid3x3, List, LayoutList, CheckCircle, BarChart, Clock, TrendingUp, CalendarIcon, RefreshCw, Loader2 } from "lucide-react";
import type { AttendanceRecord, MembershipPlan } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AttendanceNotificationHandler,
  getMembershipAlertType,
  type NotificationConfig
} from "@/lib/attendance-notifications";
import { RenewPlanDialog } from "@/components/dashboard/members/renew-plan-dialogue";
import { usePathname, useRouter } from "next/navigation";

// View mode type
type ViewMode = "grid" | "list" | "compact";

export default function AttendancePage() {
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { settings, updateSettings } = useGymSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTimeSlot, setFilterTimeSlot] = useState("all");
  const [isDateChanging, setIsDateChanging] = useState(false);
  const [newRecordIds, setNewRecordIds] = useState<Set<string>>(new Set());
  const prevRecordsRef = useRef<AttendanceRecord[]>([]);
  const isInitialLoadRef = useRef(true); // Track if this is the first data load
  const prevSelectedDateRef = useRef<Date>(selectedDate); // Track previous selected date
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Renewal dialog state
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    currentEndDate: string;
    currentPlanId?: string; // Will be populated by useEffect after fetching from Firestore
  } | null>(null);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<{
    price: number;
    duration: number;
  } | null>(null);
  const [isFetchingPlanDetails, setIsFetchingPlanDetails] = useState(false);

  // Loading state for button actions - track both member ID and action type
  const [loadingState, setLoadingState] = useState<{ memberId: string; action: 'view' | 'renew' } | null>(null);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance-view-mode');
      // Default to compact view for better space utilization
      return (saved as ViewMode) || 'compact';
    }
    return 'compact';
  });

  // Notification settings - using global gym settings
  const notificationConfig: NotificationConfig = useMemo(() => ({
    playSound: settings?.notifications?.playSound ?? true,
    volume: settings?.notifications?.volume ?? 0.7,
  }), [
    settings?.notifications?.playSound,
    settings?.notifications?.volume
  ]);

  const notificationHandlerRef = useRef<AttendanceNotificationHandler | null>(null);
  const prevNotificationConfigRef = useRef<NotificationConfig | null>(null);

  // Audio initialization state - persist in localStorage
  const [audioInitialized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('audio-initialized') === 'true';
    }
    return false;
  });

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('attendance-view-mode', viewMode);
  }, [viewMode]);

  // NAVIGATION SAFETY: Add pathname monitoring
  const pathname = usePathname();
  const [queriesEnabled, setQueriesEnabled] = useState(false);

  // Enable queries only when on attendance page
  useEffect(() => {
    if (pathname === '/dashboard/attendance') {
      setQueriesEnabled(true);
    } else {
      setQueriesEnabled(false);
    }
  }, [pathname]);

  // Real-time query for today's attendance - NAVIGATION SAFE
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !queriesEnabled) return null;
    const dateString = format(selectedDate, "yyyy-MM-dd");
    return query(
      collection(firestore, `attendance_logs/${dateString}/records`),
      orderBy("checkInTime", "desc")
    );
  }, [firestore, selectedDate, queriesEnabled]);

  const { data: attendanceRecords, isLoading, error } = useCollection<AttendanceRecord>(attendanceQuery);

  // Query for total active members count - NAVIGATION SAFE
  // Only query active members to reduce data transfer
  // ONLY enable when stats are expanded to avoid unnecessary queries
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !queriesEnabled || !isStatsOpen) return null;
    return query(
      collection(firestore, "users"),
      where("membershipStatus", "==", "active")
    );
  }, [firestore, queriesEnabled, isStatsOpen]);

  const { data: activeUsers } = useCollection(usersQuery);

  // Query for membership plans - NAVIGATION SAFE
  // ONLY fetch when renewal dialog is open to avoid unnecessary queries
  const plansQuery = useMemoFirebase(() => {
    if (!firestore || !queriesEnabled || !renewOpen) return null;
    return collection(firestore, "membershipPlans");
  }, [firestore, queriesEnabled, renewOpen]);

  const { data: plansData } = useCollection<MembershipPlan>(plansQuery);

  // Fetch current plan details from user's membership history when member is selected for renewal - NAVIGATION SAFE
  useEffect(() => {
    if (!selectedMember?.id || !firestore || !plansData || !queriesEnabled) {
      setCurrentPlanDetails(null);
      setIsFetchingPlanDetails(false);
      return;
    }

    const fetchCurrentPlanDetails = async () => {
      setIsFetchingPlanDetails(true);

      try {
        // Fetch the user's latest membership from membershipHistory subcollection
        const historyRef = collection(firestore, "users", selectedMember.id, "membershipHistory");
        const historyQuery = query(historyRef, orderBy("createdAt", "desc"), limit(1));
        const snapshot = await getDocs(historyQuery);

        if (!snapshot.empty) {
          const latestMembership = snapshot.docs[0].data();
          const planId = latestMembership.membershipPlanId;

          // Find the plan in available plans to get accurate pricing
          const plan = plansData.find(p => p.id === planId);
          if (plan) {
            setCurrentPlanDetails({
              price: plan.price,
              duration: plan.durationInDays,
            });

            // Update selectedMember with the planId for reference
            setSelectedMember(prev => prev ? { ...prev, currentPlanId: planId } : null);
          } else {
            // Fallback to using data from membership history
            setCurrentPlanDetails({
              price: latestMembership.price || 0,
              duration: latestMembership.membershipEnd && latestMembership.membershipStart
                ? differenceInDays(new Date(latestMembership.membershipEnd), new Date(latestMembership.membershipStart))
                : 30, // default 30 days
            });
            setSelectedMember(prev => prev ? { ...prev, currentPlanId: planId } : null);
          }
        } else {
          setCurrentPlanDetails(null);
        }
      } catch (error) {
        setCurrentPlanDetails(null);
      } finally {
        setIsFetchingPlanDetails(false);
      }
    };

    fetchCurrentPlanDetails();
  }, [selectedMember?.id, firestore, plansData, queriesEnabled]);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const totalCheckedIn = attendanceRecords?.length || 0;
    const totalActiveMembers = activeUsers?.length || 0;
    const percentage = totalActiveMembers > 0 ? Math.round((totalCheckedIn / totalActiveMembers) * 100) : 0;

    // Calculate peak hour (hour with most check-ins)
    const hourCounts: Record<number, number> = {};
    attendanceRecords?.forEach(record => {
      const hour = new Date(record.checkInTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour: string | null = null;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        const hourNum = parseInt(hour);
        peakHour = `${hourNum > 12 ? hourNum - 12 : hourNum} ${hourNum >= 12 ? 'PM' : 'AM'}`;
      }
    });

    return { totalCheckedIn, totalActiveMembers, percentage, peakHour };
  }, [attendanceRecords, activeUsers]);

  // Initialize notification handler
  useEffect(() => {
    // Check if config actually changed
    const configChanged = !prevNotificationConfigRef.current ||
      prevNotificationConfigRef.current.playSound !== notificationConfig.playSound ||
      prevNotificationConfigRef.current.volume !== notificationConfig.volume;

    if (!configChanged) return;

    if (!notificationHandlerRef.current) {
      notificationHandlerRef.current = new AttendanceNotificationHandler(notificationConfig);
    } else {
      notificationHandlerRef.current.updateConfig(notificationConfig);
    }

    prevNotificationConfigRef.current = notificationConfig;
  }, [notificationConfig]);

  // Reset loading state when data arrives after date change
  useEffect(() => {
    if (!isLoading && isDateChanging) {
      setIsDateChanging(false);
    }
  }, [isLoading, isDateChanging]);

  // Detect new records and trigger animation + notifications
  useEffect(() => {
    // Check if the selected date has changed
    const dateChanged = format(prevSelectedDateRef.current, "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd");

    if (dateChanged) {
      // Set date changing flag
      setIsDateChanging(true);
      // Reset initial load flag when date changes
      isInitialLoadRef.current = true;
      prevSelectedDateRef.current = selectedDate;
      prevRecordsRef.current = [];
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      prevRecordsRef.current = [];
      // Don't reset isInitialLoadRef here - only reset it when date changes
      return;
    }

    const prevIds = new Set(prevRecordsRef.current.map(r => r.id));
    const currentIds = attendanceRecords.map(r => r.id);
    const newIds = currentIds.filter(id => !prevIds.has(id));

    // Check if selected date is today (both are Date objects, so compare formatted strings)
    const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    // Debug: Log notification trigger conditions
    if (newIds.length > 0) {
      console.log('🔔 New check-in detected!', {
        newCheckIns: newIds.length,
        isInitialLoad: isInitialLoadRef.current,
        isToday,
        audioInitialized,
        hasNotificationHandler: !!notificationHandlerRef.current,
        willTriggerNotification: !isInitialLoadRef.current && isToday && audioInitialized
      });
    }

    // Trigger notifications if:
    // 1. There are new IDs
    // 2. This is NOT the initial load (prevents notifications on page load)
    // 3. The selected date is today
    // 4. Audio has been initialized
    if (newIds.length > 0 && !isInitialLoadRef.current && isToday && audioInitialized) {
      console.log('✅ Triggering notifications for', newIds.length, 'new records');
      setNewRecordIds(new Set(newIds));

      // Trigger notifications for new records
      newIds.forEach(id => {
        const record = attendanceRecords.find(r => r.id === id);
        if (record && notificationHandlerRef.current) {
          // Support both membershipEnd and membershipEndDate for compatibility
          const membershipEndDate = record.membershipEnd || (record as any).membershipEndDate;
          const alertInfo = getMembershipAlertType(
            record.membershipStatus || 'active',
            membershipEndDate
          );

          notificationHandlerRef.current.notify({
            memberName: record.name,
            alertType: alertInfo.alertType,
            daysRemaining: alertInfo.daysRemaining,
            membershipEndDate: membershipEndDate
          });
        }
      });

      // Remove animation after 3 seconds
      setTimeout(() => {
        setNewRecordIds(new Set());
      }, 3000);
    }

    // Mark that we've completed the initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }

    prevRecordsRef.current = attendanceRecords;
  }, [attendanceRecords, selectedDate, audioInitialized]);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    if (!attendanceRecords) return [];

    let records = [...attendanceRecords];

    // Sort by checkInTime descending (most recent first)
    records.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      records = records.filter(record =>
        record.name.toLowerCase().includes(query) ||
        record.userId.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      records = records.filter(record => record.membershipStatus === filterStatus);
    }

    // Filter by time slot
    if (filterTimeSlot !== "all") {
      records = records.filter(record => {
        const hour = new Date(record.checkInTime).getHours();
        if (filterTimeSlot === "morning") {
          return hour >= 6 && hour < 12; // 6 AM - 12 PM
        } else if (filterTimeSlot === "afternoon") {
          return hour >= 12 && hour < 16; // 12 PM - 4 PM
        } else if (filterTimeSlot === "evening") {
          return hour >= 16 && hour < 22; // 4 PM - 10 PM
        }
        return true;
      });
    }

    return records;
  }, [attendanceRecords, searchQuery, filterStatus, filterTimeSlot]);

  // Get border color based on membership status
  const getBorderColor = (status?: string) => {
    switch (status) {
      case "active":
        return "border-green-200 bg-green-50/50";
      case "expired":
        return "border-red-200 bg-red-50/50";
      case "pending":
        return "border-yellow-200 bg-yellow-50/50";
      default:
        return "border-gray-200 bg-gray-50/50";
    }
  };

  // Calculate days remaining or days overdue
  const getMembershipInfo = (record: AttendanceRecord) => {
    if (!record.membershipStatus) return null;

    // This is placeholder - you'll need to get actual membership end date from user data
    const today = new Date();
    const daysInfo = {
      active: { text: "Active", color: "text-green-600" },
      expired: { text: "Expired", color: "text-red-600" },
      pending: { text: "Pending", color: "text-yellow-600" }
    };

    return daysInfo[record.membershipStatus as keyof typeof daysInfo] || null;
  };

  // Get relative time string
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Gym Attendance</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading attendance data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Breadcrumbs and Settings */}
      <div className="flex items-center justify-between">
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
              <BreadcrumbPage>Attendance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Notification Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              {notificationConfig.playSound ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3">Notification Settings</h4>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="play-sound" className="flex flex-col gap-1">
                  <span>Sound Effects</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Play beep sounds for check-ins
                  </span>
                </Label>
                <Switch
                  id="play-sound"
                  checked={notificationConfig.playSound}
                  onCheckedChange={async (checked) => {
                    await updateSettings({
                      notifications: {
                        ...settings?.notifications,
                        playSound: checked,
                      }
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume">Volume: {Math.round(notificationConfig.volume * 100)}%</Label>
                <Slider
                  id="volume"
                  min={0}
                  max={100}
                  step={10}
                  value={[notificationConfig.volume * 100]}
                  onValueChange={async (value) => {
                    await updateSettings({
                      notifications: {
                        ...settings?.notifications,
                        volume: value[0] / 100,
                      }
                    });
                  }}
                />
              </div>


              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-semibold">Test Sounds</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (notificationHandlerRef.current) {
                        notificationHandlerRef.current.notify({
                          memberName: 'John',
                          alertType: 'active'
                        });
                      }
                    }}
                  >
                    Active
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (notificationHandlerRef.current) {
                        notificationHandlerRef.current.notify({
                          memberName: 'Sarah',
                          alertType: 'expiring-soon',
                          daysRemaining: 3
                        });
                      }
                    }}
                  >
                    Expiring
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (notificationHandlerRef.current) {
                        notificationHandlerRef.current.notify({
                          memberName: 'Mike',
                          alertType: 'expired'
                        });
                      }
                    }}
                  >
                    Expired
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (notificationHandlerRef.current) {
                        notificationHandlerRef.current.notify({
                          memberName: 'Emma',
                          alertType: 'pending'
                        });
                      }
                    }}
                  >
                    Pending
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Stop speech synthesis
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                >
                  Stop Speech
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Compact Search, Filters, and View Toggle */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="md:hidden">
        <Card>
          <CardContent className="pt-4 pb-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium">Filters & Search</span>
                  {(filterStatus !== "all" || filterTimeSlot !== "all" || searchQuery) && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </div>
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTimeSlot} onValueChange={setFilterTimeSlot}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Day</SelectItem>
                    <SelectItem value="morning">Morning (6-12)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-4)</SelectItem>
                    <SelectItem value="evening">Evening (4-10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    disabled={isDateChanging}
                  >
                    {isDateChanging ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarIcon className="mr-2 h-4 w-4" />
                    )}
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm text-muted-foreground flex-1">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'member' : 'members'}
                </span>
                <div className="inline-flex rounded-lg border bg-background p-1 gap-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-7 px-2"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 px-2"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "compact" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("compact")}
                    className="h-7 px-2"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Desktop Filters - Always Visible - Compact */}
      <Card className="hidden md:block bg-gray-50/50 dark:bg-gray-800/50 border-0 shadow-sm dark:border dark:border-white/5">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Left Side: Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-sm rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTimeSlot} onValueChange={setFilterTimeSlot}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 shadow-sm">
                  <SelectValue placeholder="Time Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Day</SelectItem>
                  <SelectItem value="morning">Morning (6-12)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12-4)</SelectItem>
                  <SelectItem value="evening">Evening (4-10)</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-auto h-8 text-sm justify-start text-left font-normal rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 shadow-sm px-3"
                    )}
                    disabled={isDateChanging}
                  >
                    {isDateChanging ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    )}
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Right Side: Member Count and View Toggle */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>
              <div className="inline-flex rounded-lg border-0 bg-white dark:bg-gray-700 shadow-sm p-0.5 gap-0.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-7 px-2 gap-1.5 rounded-md dark:text-gray-300"
                >
                  <Grid3x3 className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2 gap-1.5 rounded-md dark:text-gray-300"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="h-7 px-2 gap-1.5 rounded-md dark:text-gray-300"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">Compact</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary Stats */}
      {!isLoading && (
        <>
          {/* Mobile: Collapsible Stats */}
          <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen} className="md:hidden">
            <Card>
              <CardContent className="pt-4 pb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Statistics</span>
                      <Badge variant="outline" className="ml-2">
                        {attendanceStats.totalCheckedIn} checked in
                      </Badge>
                    </div>
                    {isStatsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Today's Attendance</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold">{attendanceStats.totalCheckedIn}</p>
                        <p className="text-sm text-muted-foreground">/{attendanceStats.totalActiveMembers}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attendanceStats.percentage}% checked in
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Peak Hour</p>
                      <p className="text-2xl font-bold">
                        {attendanceStats.peakHour || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Most active time
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>

          {/* Desktop: Always Visible Stats - Compact */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Today's Attendance Card */}
            <Card className="gradient-green-subtle border-0 overflow-hidden dark:bg-gray-800/95 dark:border-t dark:border-t-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Today's Attendance</p>
                  <CheckCircle className="h-5 w-5 text-green-500/40 dark:text-green-500/30" />
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{attendanceStats.totalCheckedIn}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">/ {attendanceStats.totalActiveMembers}</p>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  {attendanceStats.percentage}% checked in
                </p>
              </CardContent>
            </Card>

            {/* Total Check-ins Card */}
            <Card className="gradient-blue-subtle border-0 overflow-hidden dark:bg-gray-800/95 dark:border-t dark:border-t-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Check-ins</p>
                  <BarChart className="h-5 w-5 text-blue-500/40 dark:text-blue-500/30" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{attendanceStats.totalCheckedIn}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  {format(new Date(selectedDate), "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>

            {/* Peak Hour Card */}
            <Card className="gradient-purple-subtle border-0 overflow-hidden dark:bg-gray-800/95 dark:border-t dark:border-t-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Peak Hour</p>
                  <Clock className="h-5 w-5 text-purple-500/40 dark:text-purple-500/30" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {attendanceStats.peakHour || "-"}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  Most active time
                </p>
              </CardContent>
            </Card>

            {/* Avg Daily Attendance Card */}
            <Card className="gradient-orange-subtle border-0 overflow-hidden dark:bg-gray-800/95 dark:border-t dark:border-t-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Avg Daily</p>
                  <TrendingUp className="h-5 w-5 text-orange-500/40 dark:text-orange-500/30" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{attendanceStats.totalCheckedIn}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  Based on today
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Attendance Records - Dynamic View */}
      {(isLoading || isDateChanging) ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <SearchBarSkeleton />
            </CardContent>
          </Card>
          <MemberCardGridSkeleton count={12} />
        </>
      ) : filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {searchQuery ? "No members found matching your search" : "No attendance records for this date"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grid View - Cards */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in-50 duration-300">
              {filteredRecords.map((record) => {
                const isNew = newRecordIds.has(record.id);
                const isActive = record.membershipStatus === "active";
                const isViewLoading = loadingState?.memberId === record.userId && loadingState?.action === 'view';
                const isRenewLoading = loadingState?.memberId === record.userId && loadingState?.action === 'renew';
                const isAnyLoading = isViewLoading || isRenewLoading;

                return (
                  <Card
                    key={record.id}
                    className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                      isActive
                        ? "bg-white border-t-4 border-t-green-500 dark:bg-gray-800 dark:border-t-green-500"
                        : "bg-gray-50 border border-gray-200 opacity-70 dark:bg-gray-900 dark:border-gray-700"
                    } ${isNew ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
                    onClick={() => {
                      window.location.href = `/dashboard/members/view/${record.userId}`;
                    }}
                  >
                      <CardContent className="p-6">
                      {/* Avatar */}
                      <div className="relative mx-auto w-fit mb-5">
                        <Avatar className={`h-40 w-40 transition-all ${
                          isActive
                            ? "border-[6px] border-green-500 shadow-xl shadow-green-500/30"
                            : "border-[3px] border-gray-300 grayscale"
                        }`}>
                          <AvatarImage
                            src={record.profileImageUrl}
                            alt={record.name}
                            className={!isActive ? "grayscale" : ""}
                          />
                          <AvatarFallback className={`text-3xl font-bold ${
                            isActive
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {isNew && (
                          <div className="absolute -top-1 -right-1 h-7 w-7 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
                        )}
                        {isActive && (
                          <div className="absolute -bottom-2 -right-2">
                            <CheckCircle className="h-10 w-10 text-green-500 bg-white dark:bg-gray-800 rounded-full shadow-lg" />
                          </div>
                        )}
                      </div>

                      {/* Name - HERO */}
                      <h3 className={`font-semibold text-center truncate mb-2 ${
                        isActive
                          ? "text-lg text-gray-900 dark:text-gray-100"
                          : "text-base text-gray-500 dark:text-gray-500"
                      }`}>
                        {record.name}
                      </h3>

                      {/* Time - Secondary */}
                      <p className="text-sm text-center text-muted-foreground mb-3">
                        {format(new Date(record.checkInTime), "h:mm a")}
                      </p>

                      {/* Days Remaining / Expired with Renew Button */}
                      {(() => {
                        // Support both membershipEnd and membershipEndDate for compatibility
                        const membershipEndDate = record.membershipEnd || (record as any).membershipEndDate;
                        const alertInfo = getMembershipAlertType(
                          record.membershipStatus || 'active',
                          membershipEndDate
                        );
                        const { daysRemaining } = alertInfo;

                        if (daysRemaining === undefined) return null;

                        let badgeText = '';
                        let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'secondary';
                        let badgeClassName = 'h-6 px-3 text-xs font-medium';

                        if (daysRemaining < 0) {
                          const daysExpired = Math.abs(daysRemaining);
                          badgeText = `Expired ${daysExpired} ${daysExpired === 1 ? 'day' : 'days'} ago`;
                          badgeVariant = 'destructive';
                        } else if (daysRemaining === 0) {
                          badgeText = 'Expires today';
                          badgeVariant = 'destructive';
                        } else if (daysRemaining === 1) {
                          badgeText = '1 day left';
                          badgeVariant = 'destructive';
                          badgeClassName = 'h-6 px-3 text-xs font-medium bg-orange-500 text-white';
                        } else if (daysRemaining <= 3) {
                          badgeText = `${daysRemaining} days left`;
                          badgeVariant = 'outline';
                          badgeClassName = 'h-6 px-3 text-xs font-medium border-orange-500 text-orange-700';
                        } else if (daysRemaining <= 7) {
                          badgeText = `${daysRemaining} days left`;
                          badgeVariant = 'secondary';
                          badgeClassName = 'h-6 px-3 text-xs font-medium bg-blue-100 text-blue-700';
                        } else {
                          badgeText = `${daysRemaining} days left`;
                          badgeVariant = 'secondary';
                          badgeClassName = 'h-6 px-3 text-xs font-medium';
                        }

                        return (
                          <div className="flex flex-col items-center gap-2 mb-3">
                            <Badge variant={badgeVariant} className={badgeClassName}>
                              {badgeText}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs gap-1.5 hover:bg-green-50 hover:border-green-500 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-400"
                              disabled={isRenewLoading}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLoadingState({ memberId: record.userId, action: 'renew' });
                                setSelectedMember({
                                  id: record.userId,
                                  name: record.name,
                                  currentEndDate: record.membershipEnd || new Date().toISOString(),
                                });
                                setRenewOpen(true);
                                // Reset loading after dialog opens
                                setTimeout(() => setLoadingState(null), 500);
                              }}
                            >
                              {isRenewLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              <span>Renew</span>
                            </Button>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <Card className="animate-in fade-in-50 duration-300">
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredRecords.map((record) => {
                    const membershipInfo = getMembershipInfo(record);
                    const isNew = newRecordIds.has(record.id);
                    const isActive = record.membershipStatus === "active";

                    return (
                      <div key={record.id} className="relative">
                        <Link href={`/dashboard/members/view/${record.userId}`}>
                          <div
                            className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                              isNew ? "bg-green-50 border-l-4 border-l-green-500" : ""
                            }`}
                          >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <Avatar className={`h-16 w-16 transition-all ${
                                isActive
                                  ? "border-[4px] border-green-500 shadow-md shadow-green-500/20"
                                  : "border-2 border-gray-300 opacity-60"
                              }`}>
                                <AvatarImage
                                  src={record.profileImageUrl}
                                  alt={record.name}
                                  className={!isActive ? "grayscale" : ""}
                                />
                                <AvatarFallback className={`text-base font-semibold ${
                                  isActive
                                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              {isNew && (
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
                              )}
                              {isActive && (
                                <div className="absolute -bottom-1 -right-1">
                                  <CheckCircle className="h-6 w-6 text-green-500 bg-white dark:bg-gray-800 rounded-full shadow-sm" />
                                </div>
                              )}
                            </div>

                          {/* Name and Email */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{record.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{record.email || "No email"}</p>
                          </div>

                          {/* Check-in Time */}
                          <div className="hidden sm:flex flex-col items-end">
                            <p className="text-xs text-muted-foreground">Check-in</p>
                            <p className="font-semibold text-sm">
                              {format(new Date(record.checkInTime), "hh:mm a")}
                            </p>
                          </div>

                          {/* ESSL ID */}
                          <div className="hidden md:block">
                            {record.biometricDeviceId && (
                              <Badge variant="outline" className="text-xs">
                                {record.biometricDeviceId}
                              </Badge>
                            )}
                          </div>

                          {/* Membership Status */}
                          <div className="hidden lg:block">
                            {membershipInfo && (
                              <Badge
                                variant={
                                  record.membershipStatus === "active"
                                    ? "default"
                                    : record.membershipStatus === "expired"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {record.membershipStatus?.charAt(0).toUpperCase() + record.membershipStatus?.slice(1)}
                              </Badge>
                            )}
                          </div>

                          {/* Days Remaining / Expired */}
                          <div className="hidden xl:block">
                            {(() => {
                              // Support both membershipEnd and membershipEndDate for compatibility
                              const membershipEndDate = record.membershipEnd || (record as any).membershipEndDate;
                              const alertInfo = getMembershipAlertType(
                                record.membershipStatus || 'active',
                                membershipEndDate
                              );
                              const { daysRemaining } = alertInfo;

                              if (daysRemaining === undefined) return null;

                              let badgeText = '';
                              let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'secondary';

                              if (daysRemaining < 0) {
                                const daysExpired = Math.abs(daysRemaining);
                                badgeText = `Expired ${daysExpired}d ago`;
                                badgeVariant = 'destructive';
                              } else if (daysRemaining === 0) {
                                badgeText = 'Expires today';
                                badgeVariant = 'destructive';
                              } else if (daysRemaining <= 3) {
                                badgeText = `${daysRemaining}d left`;
                                badgeVariant = 'outline';
                              } else {
                                badgeText = `${daysRemaining}d left`;
                                badgeVariant = 'secondary';
                              }

                              return (
                                <Badge variant={badgeVariant} className="text-xs">
                                  {badgeText}
                                </Badge>
                              );
                            })()}
                          </div>

                          {/* Mobile Check-in (visible on mobile) */}
                          <div className="sm:hidden text-right">
                            <p className="font-semibold text-xs">
                              {format(new Date(record.checkInTime), "hh:mm a")}
                            </p>
                          </div>

                          {/* Renew Plan Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 gap-2 hover:bg-green-50 hover:border-green-500 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-400"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedMember({
                                id: record.userId,
                                name: record.name,
                                currentEndDate: record.membershipEnd || new Date().toISOString(),
                              });
                              setRenewOpen(true);
                            }}
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span className="hidden xl:inline">Renew</span>
                          </Button>
                        </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact List View - Ultra-efficient design */}
          {viewMode === "compact" && (
            <Card className="animate-in fade-in-50 duration-300">
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRecords.map((record) => {
                    const isNew = newRecordIds.has(record.id);
                    const isActive = record.membershipStatus === "active";
                    const membershipInfo = getMembershipInfo(record);
                    const isViewLoading = loadingState?.memberId === record.userId && loadingState?.action === 'view';
                    const isRenewLoading = loadingState?.memberId === record.userId && loadingState?.action === 'renew';
                    const isAnyLoading = isViewLoading || isRenewLoading;

                    return (
                      <div
                        key={record.id}
                        className={`group relative ${
                          isNew
                            ? "bg-green-50/50 dark:bg-green-950/20 border-l-2 border-l-green-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                          {/* Avatar - Small and compact */}
                          <div className="relative flex-shrink-0">
                            <Avatar className={`h-12 w-12 transition-all ${
                              isActive
                                ? "border-[3px] border-green-500 shadow-md shadow-green-500/20"
                                : "border-2 border-gray-200 dark:border-gray-700 opacity-60"
                            }`}>
                              <AvatarImage
                                src={record.profileImageUrl}
                                alt={record.name}
                                className={!isActive ? "grayscale" : ""}
                              />
                              <AvatarFallback className={`text-sm font-bold ${
                                isActive
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                              }`}>
                                {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {isNew && (
                              <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
                            )}
                          </div>

                          {/* Member Info - Name is HERO element */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/dashboard/members/view/${record.userId}`} className="block">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold truncate ${
                                  isActive
                                    ? "text-base text-gray-900 dark:text-gray-100"
                                    : "text-sm text-gray-500 dark:text-gray-500"
                                }`}>
                                  {record.name}
                                </h3>
                                {isActive && (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(record.checkInTime), "h:mm a")}
                                  <span className="mx-1">•</span>
                                  {getRelativeTime(record.checkInTime)}
                                </p>
                                {record.biometricDeviceId && (
                                  <>
                                    <span className="text-[11px] text-muted-foreground">•</span>
                                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal border-gray-200 dark:border-gray-700">
                                      #{record.biometricDeviceId}
                                    </Badge>
                                  </>
                                )}
                                {!isActive && membershipInfo && record.membershipStatus && (
                                  <>
                                    <span className="text-[11px] text-muted-foreground">•</span>
                                    <Badge
                                      variant={
                                        record.membershipStatus === "expired" ? "destructive" : "secondary"
                                      }
                                      className="h-4 px-1.5 text-[9px] font-normal"
                                    >
                                      {record.membershipStatus.charAt(0).toUpperCase() + record.membershipStatus.slice(1)}
                                    </Badge>
                                  </>
                                )}
                                {(() => {
                                  // Support both membershipEnd and membershipEndDate for compatibility
                                  const membershipEndDate = record.membershipEnd || (record as any).membershipEndDate;
                                  const alertInfo = getMembershipAlertType(
                                    record.membershipStatus || 'active',
                                    membershipEndDate
                                  );
                                  const { daysRemaining } = alertInfo;

                                  if (daysRemaining === undefined) return null;

                                  let badgeText = '';
                                  let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'secondary';

                                  if (daysRemaining < 0) {
                                    const daysExpired = Math.abs(daysRemaining);
                                    badgeText = `Exp ${daysExpired}d ago`;
                                    badgeVariant = 'destructive';
                                  } else if (daysRemaining === 0) {
                                    badgeText = 'Exp today';
                                    badgeVariant = 'destructive';
                                  } else if (daysRemaining <= 3) {
                                    badgeText = `${daysRemaining}d left`;
                                    badgeVariant = 'outline';
                                  } else if (daysRemaining <= 7) {
                                    badgeText = `${daysRemaining}d`;
                                    badgeVariant = 'secondary';
                                  } else {
                                    return null; // Don't show for long-term memberships in compact view
                                  }

                                  return (
                                    <>
                                      <span className="text-[11px] text-muted-foreground">•</span>
                                      <Badge variant={badgeVariant} className="h-4 px-1.5 text-[9px] font-normal">
                                        {badgeText}
                                      </Badge>
                                    </>
                                  );
                                })()}
                              </div>
                            </Link>
                          </div>

                          {/* Actions - Compact buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                              disabled={isAnyLoading}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setLoadingState({ memberId: record.userId, action: 'view' });
                                // Disable queries before navigation to release Firebase connections
                                setQueriesEnabled(false);
                                await new Promise(resolve => setTimeout(resolve, 100));
                                router.push(`/dashboard/members/view/${record.userId}`);
                              }}
                            >
                              {isViewLoading ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Users className="h-3 w-3 mr-1" />
                              )}
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-400"
                              disabled={isAnyLoading}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLoadingState({ memberId: record.userId, action: 'renew' });
                                setSelectedMember({
                                  id: record.userId,
                                  name: record.name,
                                  currentEndDate: record.membershipEnd || new Date().toISOString(),
                                });
                                setRenewOpen(true);
                                setTimeout(() => setLoadingState(null), 500);
                              }}
                            >
                              {isRenewLoading ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3 mr-1" />
                              )}
                              <span className="hidden sm:inline">Renew</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Renew Membership Dialog */}
      {selectedMember && plansData && !isFetchingPlanDetails && (() => {
        console.log('🎨 Rendering RenewPlanDialog with:', {
          currentPlanPrice: currentPlanDetails?.price,
          currentPlanDuration: currentPlanDetails?.duration,
          isFetchingPlanDetails,
          selectedMemberId: selectedMember.id
        });
        return (
          <RenewPlanDialog
            memberId={selectedMember.id}
            memberName={selectedMember.name}
            currentEndDate={selectedMember.currentEndDate}
            currentPlanId={selectedMember.currentPlanId}
            currentPlanPrice={currentPlanDetails?.price}
            currentPlanDuration={currentPlanDetails?.duration}
            availablePlans={plansData}
            open={renewOpen && !!selectedMember && !isFetchingPlanDetails}
            onOpenChange={(open) => {
              setRenewOpen(open);
              if (!open) {
                setSelectedMember(null);
                setCurrentPlanDetails(null);
              }
            }}
            onSuccess={() => {
              // Invalidate queries to refresh the data
              queryClient.invalidateQueries({ queryKey: ["users"] });
              queryClient.invalidateQueries({ queryKey: ['processedMembers'] });
              queryClient.invalidateQueries({ queryKey: ['revenueSummary'] });
              queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
              queryClient.invalidateQueries({ queryKey: ['payments'] });
              setCurrentPlanDetails(null);
            }}
          />
        );
      })()}
    </div>
  );
}
