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
import { Search, Users, Volume2, VolumeX, Settings, Home } from "lucide-react";
import type { AttendanceRecord } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  AttendanceNotificationHandler,
  getMembershipAlertType,
  type NotificationConfig
} from "@/lib/attendance-notifications";

export default function AttendancePage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterStatus, setFilterStatus] = useState("all");
  const [newRecordIds, setNewRecordIds] = useState<Set<string>>(new Set());
  const prevRecordsRef = useRef<AttendanceRecord[]>([]);

  // Notification settings
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    playSound: true,
    playVoice: true,
    volume: 0.7,
  });
  const notificationHandlerRef = useRef<AttendanceNotificationHandler | null>(null);

  // Real-time query for today's attendance
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `attendance_logs/${selectedDate}/records`);
  }, [firestore, selectedDate]);

  const { data: attendanceRecords, isLoading, error } = useCollection<AttendanceRecord>(attendanceQuery);

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

    return records;
  }, [attendanceRecords, searchQuery, filterStatus]);

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
            <BreadcrumbPage>Attendance</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Gym Attendance</h1>
          <p className="text-muted-foreground">Real-time check-ins from ESSL biometric system</p>
        </div>

        {/* Notification Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
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

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (notificationHandlerRef.current) {
                      notificationHandlerRef.current.test();
                    }
                  }}
                >
                  Test Notifications
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full md:w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Member Cards Grid */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecords.map((record) => {
            const membershipInfo = getMembershipInfo(record);
            const isNew = newRecordIds.has(record.id);

            return (
              <Card
                key={record.id}
                className={`overflow-hidden border-2 transition-all duration-300 ${getBorderColor(record.membershipStatus)} ${
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

                    {/* Membership Info */}
                    {membershipInfo && (
                      <div className="w-full">
                        <p className={`text-xs font-medium ${membershipInfo.color}`}>
                          {record.membershipStatus?.charAt(0).toUpperCase() + record.membershipStatus?.slice(1)}
                        </p>
                      </div>
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

                    {/* Badges */}
                    <div className="flex gap-2 flex-wrap justify-center pt-2">
                      <Badge
                        variant={record.source === "essl" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {record.source === "essl" ? "ESSL" : record.source.toUpperCase()}
                      </Badge>
                      {record.biometricDeviceId && (
                        <Badge variant="outline" className="text-xs">
                          {record.biometricDeviceId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
