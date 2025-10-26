"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MemberCardGridSkeleton, SearchBarSkeleton } from "@/components/ui/loading-skeletons";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Users, Volume2, VolumeX, Settings, Home, Grid3x3, List, LayoutList } from "lucide-react";
import type { AttendanceRecord } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
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

// View mode type
type ViewMode = "grid" | "list" | "compact";

export default function AttendancePage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTimeSlot, setFilterTimeSlot] = useState("all");
  const [newRecordIds, setNewRecordIds] = useState<Set<string>>(new Set());
  const prevRecordsRef = useRef<AttendanceRecord[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance-view-mode');
      // Default to list view on mobile, grid on desktop
      const isMobile = window.innerWidth < 768;
      return (saved as ViewMode) || (isMobile ? 'list' : 'grid');
    }
    return 'grid';
  });

  // Notification settings
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    playSound: true,
    playVoice: true,
    volume: 0.7,
    voiceRate: 0.95,
    voicePitch: 1.05,
  });
  const notificationHandlerRef = useRef<AttendanceNotificationHandler | null>(null);

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('attendance-view-mode', viewMode);
  }, [viewMode]);

  // Real-time query for today's attendance
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `attendance_logs/${selectedDate}/records`);
  }, [firestore, selectedDate]);

  const { data: attendanceRecords, isLoading, error } = useCollection<AttendanceRecord>(attendanceQuery);

  // Query for total active members count
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users");
  }, [firestore]);

  const { data: allUsers } = useCollection(usersQuery);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    if (!attendanceRecords) return { totalCheckedIn: 0, totalMembers: 0, percentage: 0, peakHour: null };

    const totalCheckedIn = attendanceRecords.length;
    const totalMembers = allUsers?.length || 0;
    const percentage = totalMembers > 0 ? Math.round((totalCheckedIn / totalMembers) * 100) : 0;

    // Calculate peak hour (hour with most check-ins)
    const hourCounts: Record<number, number> = {};
    attendanceRecords.forEach(record => {
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

    return { totalCheckedIn, totalMembers, percentage, peakHour };
  }, [attendanceRecords, allUsers]);

  // Initialize notification handler
  useEffect(() => {
    if (!notificationHandlerRef.current) {
      notificationHandlerRef.current = new AttendanceNotificationHandler(notificationConfig);
    } else {
      notificationHandlerRef.current.updateConfig(notificationConfig);
    }
  }, [notificationConfig]);

  // Detect new records and trigger animation + notifications
  useEffect(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      prevRecordsRef.current = [];
      return;
    }

    const prevIds = new Set(prevRecordsRef.current.map(r => r.id));
    const currentIds = attendanceRecords.map(r => r.id);
    const newIds = currentIds.filter(id => !prevIds.has(id));

    if (newIds.length > 0 && prevRecordsRef.current.length > 0 && selectedDate === format(new Date(), "yyyy-MM-dd")) {
      setNewRecordIds(new Set(newIds));

      // Trigger notifications for new records
      newIds.forEach(id => {
        const record = attendanceRecords.find(r => r.id === id);
        if (record && notificationHandlerRef.current) {
          const alertInfo = getMembershipAlertType(
            record.membershipStatus || 'active',
            record.membershipEnd
          );

          notificationHandlerRef.current.notify({
            memberName: record.name,
            alertType: alertInfo.alertType,
            daysRemaining: alertInfo.daysRemaining,
            membershipEndDate: record.membershipEnd
          });
        }
      });

      // Remove animation after 3 seconds
      setTimeout(() => {
        setNewRecordIds(new Set());
      }, 3000);
    }

    prevRecordsRef.current = attendanceRecords;
  }, [attendanceRecords, selectedDate]);

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

  if (error) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
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
              {notificationConfig.playSound || notificationConfig.playVoice ? (
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
                  onCheckedChange={(checked) =>
                    setNotificationConfig(prev => ({ ...prev, playSound: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="play-voice" className="flex flex-col gap-1">
                  <span>Voice Announcements</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Announce membership status
                  </span>
                </Label>
                <Switch
                  id="play-voice"
                  checked={notificationConfig.playVoice}
                  onCheckedChange={(checked) =>
                    setNotificationConfig(prev => ({ ...prev, playVoice: checked }))
                  }
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
                  onValueChange={(value) =>
                    setNotificationConfig(prev => ({ ...prev, volume: value[0] / 100 }))
                  }
                />
              </div>

              {/* Voice Controls */}
              {notificationConfig.playVoice && (
                <>
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="voice-speed" className="text-xs font-semibold">
                      Voice Settings
                    </Label>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="voice-speed" className="text-xs">
                          Speech Speed: {((notificationConfig.voiceRate ?? 0.95) * 100).toFixed(0)}%
                        </Label>
                      </div>
                      <Slider
                        id="voice-speed"
                        min={50}
                        max={200}
                        step={5}
                        value={[(notificationConfig.voiceRate ?? 0.95) * 100]}
                        onValueChange={(value) =>
                          setNotificationConfig(prev => ({ ...prev, voiceRate: value[0] / 100 }))
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {(notificationConfig.voiceRate ?? 0.95) < 0.8 ? "Very Slow" :
                         (notificationConfig.voiceRate ?? 0.95) < 0.95 ? "Slow" :
                         (notificationConfig.voiceRate ?? 0.95) < 1.1 ? "Normal" :
                         (notificationConfig.voiceRate ?? 0.95) < 1.3 ? "Fast" : "Very Fast"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="voice-pitch" className="text-xs">
                          Voice Pitch: {((notificationConfig.voicePitch ?? 1.05) * 100).toFixed(0)}%
                        </Label>
                      </div>
                      <Slider
                        id="voice-pitch"
                        min={75}
                        max={150}
                        step={5}
                        value={[(notificationConfig.voicePitch ?? 1.05) * 100]}
                        onValueChange={(value) =>
                          setNotificationConfig(prev => ({ ...prev, voicePitch: value[0] / 100 }))
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {(notificationConfig.voicePitch ?? 1.05) < 0.9 ? "Very Low" :
                         (notificationConfig.voicePitch ?? 1.05) < 1.0 ? "Low" :
                         (notificationConfig.voicePitch ?? 1.05) < 1.15 ? "Normal" :
                         (notificationConfig.voicePitch ?? 1.05) < 1.3 ? "High" : "Very High"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-semibold">Test Voice</Label>
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
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9"
              />
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

      {/* Desktop Filters - Always Visible */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Left Side: Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px] h-9">
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
                <SelectTrigger className="w-full sm:w-[140px] h-9">
                  <SelectValue placeholder="Time Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Day</SelectItem>
                  <SelectItem value="morning">Morning (6-12)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12-4)</SelectItem>
                  <SelectItem value="evening">Evening (4-10)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto h-9"
              />
            </div>

            {/* Right Side: Member Count and View Toggle */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <span className="text-sm text-muted-foreground">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'member' : 'members'}
              </span>
              <div className="inline-flex rounded-lg border bg-background p-1 gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-7 px-3 gap-1.5"
                >
                  <Grid3x3 className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 px-3 gap-1.5"
                >
                  <List className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="h-7 px-3 gap-1.5"
                >
                  <LayoutList className="h-4 w-4" />
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
                        {attendanceStats.totalCheckedIn}/{attendanceStats.totalMembers}
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
                        <p className="text-sm text-muted-foreground">/{attendanceStats.totalMembers}</p>
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

          {/* Desktop: Always Visible Stats */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Today's Attendance</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{attendanceStats.totalCheckedIn}</p>
                    <p className="text-muted-foreground">of {attendanceStats.totalMembers}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {attendanceStats.percentage}% checked in today
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Check-ins</p>
                  <p className="text-3xl font-bold">{attendanceStats.totalCheckedIn}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                  <p className="text-3xl font-bold">
                    {attendanceStats.peakHour || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Most active time
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg Daily Attendance</p>
                  <p className="text-3xl font-bold">{attendanceStats.totalCheckedIn}</p>
                  <p className="text-xs text-muted-foreground">
                    Based on today's data
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Attendance Records - Dynamic View */}
      {isLoading ? (
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
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in-50 duration-300">
              {filteredRecords.map((record) => {
                const membershipInfo = getMembershipInfo(record);
                const isNew = newRecordIds.has(record.id);

                return (
                  <Link href={`/dashboard/members/view/${record.userId}`} key={record.id}>
                    <Card
                      className={`overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] ${getBorderColor(record.membershipStatus)} ${
                        isNew ? "animate-pulse-glow" : ""
                      }`}
                    >
                    <CardContent className="p-5">
                      <div className="flex flex-col items-center text-center space-y-3">
                        {/* Avatar */}
                        <div className="relative">
                          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                            <AvatarImage src={record.profileImageUrl} alt={record.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {isNew && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-ping" />
                          )}
                        </div>

                        {/* Name */}
                        <div className="w-full">
                          <h3 className="font-bold text-base truncate">{record.name}</h3>
                        </div>

                        {/* Membership Status Badge - Prominent */}
                        {record.membershipStatus && (
                          <Badge
                            variant={
                              record.membershipStatus === "active"
                                ? "default"
                                : record.membershipStatus === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs font-semibold px-3 py-1"
                          >
                            {record.membershipStatus.charAt(0).toUpperCase() + record.membershipStatus.slice(1)}
                          </Badge>
                        )}

                        {/* Check-in Time */}
                        <div className="w-full pt-2 border-t border-gray-200">
                          <p className="text-xs text-muted-foreground">Checked in at</p>
                          <p className="font-semibold text-sm">
                            {format(new Date(record.checkInTime), "hh:mm a")}
                          </p>
                        </div>

                        {/* Check-out Time */}
                        {record.checkOutTime && (
                          <div className="w-full pt-2 border-t border-gray-200">
                            <p className="text-xs text-muted-foreground">Checked out at</p>
                            <p className="font-semibold text-sm">
                              {format(new Date(record.checkOutTime), "hh:mm a")}
                            </p>
                          </div>
                        )}

                        {/* Device ID Badge (removed ESSL tag) */}
                        {record.biometricDeviceId && (
                          <div className="pt-2">
                            <Badge variant="outline" className="text-xs">
                              ID: {record.biometricDeviceId}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
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

                    return (
                      <Link href={`/dashboard/members/view/${record.userId}`} key={record.id}>
                        <div
                          className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                            isNew ? "bg-green-50 border-l-4 border-l-green-500" : ""
                          }`}
                        >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage src={record.profileImageUrl} alt={record.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {isNew && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
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

                        {/* Mobile Check-in (visible on mobile) */}
                        <div className="sm:hidden text-right">
                          <p className="font-semibold text-xs">
                            {format(new Date(record.checkInTime), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact List View */}
          {viewMode === "compact" && (
            <Card className="animate-in fade-in-50 duration-300">
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredRecords.map((record) => {
                    const isNew = newRecordIds.has(record.id);

                    return (
                      <Link href={`/dashboard/members/view/${record.userId}`} key={record.id}>
                        <div
                          className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                            isNew ? "bg-green-50 border-l-4 border-l-green-500" : ""
                          }`}
                        >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={record.profileImageUrl} alt={record.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {record.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {isNew && (
                            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-ping" />
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{record.name}</h3>
                        </div>

                        {/* Check-in Time */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">
                            {format(new Date(record.checkInTime), "hh:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {format(new Date(record.checkInTime), "MMM dd")}
                          </p>
                        </div>
                      </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
