"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Bell,
  Fingerprint,
  ClipboardList,
  BarChart3,
  User,
  Save,
  Clock,
  UserPlus,
  Shield
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";
import { AddStaffDialog } from "@/components/dashboard/settings/add-staff-dialog";
import { StaffList } from "@/components/dashboard/settings/staff-list";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    upi: true,
    card: true,
    netBanking: false
  });

  // Late Payment Settings
  const [lateFeeAmount, setLateFeeAmount] = useState("100");
  const [gracePeriodDays, setGracePeriodDays] = useState("3");
  const [autoSuspendAfterDays, setAutoSuspendAfterDays] = useState("7");

  // Notification Settings
  const [notifications, setNotifications] = useState({
    expiryReminder: true,
    paymentDue: true,
    newMember: false,
    dailyReport: false,
    weeklyReport: true,
    monthlyReport: false
  });
  const [expiryReminderDays, setExpiryReminderDays] = useState("7");

  // Biometric Integration
  const [esslDeviceIp, setEsslDeviceIp] = useState("192.168.1.100");
  const [syncInterval, setSyncInterval] = useState("5");
  const [autoSync, setAutoSync] = useState(true);

  // Attendance Settings
  const [allowManualCheckIn, setAllowManualCheckIn] = useState(true);
  const [attendanceGracePeriod, setAttendanceGracePeriod] = useState("15");

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // TODO: Implement actual save to Firebase
    alert("Settings saved successfully!");
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-16 sm:pb-6 max-w-full overflow-hidden">
      {/* Header - Desktop only shows breadcrumb + save button */}
      <div className="hidden sm:flex items-center justify-between gap-4">
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
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={handleSave} disabled={isSaving} variant="outline" className="w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Mobile header - Just description, no redundant title */}
      <div className="sm:hidden">
        <p className="text-sm text-muted-foreground">
          Manage your gym settings and preferences
        </p>
      </div>

      <Tabs defaultValue="billing" className="space-y-3 sm:space-y-4">
        {/* Tab Navigation with Scroll Indicators */}
        <div className="relative w-full sm:mx-0">
          {/* Left fade gradient indicator - mobile only */}
          <div className="sm:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

          {/* Scrollable tabs container */}
          <div className="overflow-x-auto overflow-y-visible sm:overflow-visible snap-x snap-mandatory scrollbar-hide">
            <TabsList className="inline-flex sm:grid sm:w-full grid-cols-4 lg:grid-cols-7 gap-1 w-max sm:w-full min-w-full sm:min-w-0 px-2 sm:px-0">
              <TabsTrigger value="billing" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="staff" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="biometric" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <Fingerprint className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Device
              </TabsTrigger>
              <TabsTrigger value="attendance" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Check-in
              </TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 snap-start">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 hidden sm:inline" />
                Profile
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Right fade gradient indicator - mobile only */}
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        </div>

        {/* Billing & Payments */}
        <TabsContent value="billing" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Payment Methods</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Payment methods accepted at your gym
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Cash</Label>
                  <p className="text-xs text-muted-foreground/80">Physical currency</p>
                </div>
                <Switch
                  checked={paymentMethods.cash}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, cash: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">UPI</Label>
                  <p className="text-xs text-muted-foreground/80">QR code payments</p>
                </div>
                <Switch
                  checked={paymentMethods.upi}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, upi: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Cards</Label>
                  <p className="text-xs text-muted-foreground/80">Credit/debit cards</p>
                </div>
                <Switch
                  checked={paymentMethods.card}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, card: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Net Banking</Label>
                  <p className="text-xs text-muted-foreground/80">Online transfers</p>
                </div>
                <Switch
                  checked={paymentMethods.netBanking}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, netBanking: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Late Payment Policies</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Late fees and grace periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="late-fee" className="text-xs sm:text-sm font-medium">Late Fee (₹)</Label>
                  <Input
                    id="late-fee"
                    type="number"
                    inputMode="numeric"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(e.target.value)}
                    placeholder="100"
                    className="h-9 text-base"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    After grace period
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grace-period" className="text-xs sm:text-sm font-medium">Grace (Days)</Label>
                  <Input
                    id="grace-period"
                    type="number"
                    inputMode="numeric"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(e.target.value)}
                    placeholder="3"
                    className="h-9 text-base"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    Before late fee
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auto-suspend" className="text-xs sm:text-sm font-medium">Suspend (Days)</Label>
                  <Input
                    id="auto-suspend"
                    type="number"
                    inputMode="numeric"
                    value={autoSuspendAfterDays}
                    onChange={(e) => setAutoSuspendAfterDays(e.target.value)}
                    placeholder="7"
                    className="h-9 text-base"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    If still unpaid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Notifications</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Automatic alerts for members and admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Expiry Reminders</Label>
                  <p className="text-xs text-muted-foreground/80">Before membership expires</p>
                </div>
                <Switch
                  checked={notifications.expiryReminder}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, expiryReminder: checked })}
                />
              </div>

              {notifications.expiryReminder && (
                <div className="ml-4 space-y-1.5">
                  <Label htmlFor="expiry-days" className="text-xs sm:text-sm font-medium">Remind Before (Days)</Label>
                  <Input
                    id="expiry-days"
                    type="number"
                    inputMode="numeric"
                    value={expiryReminderDays}
                    onChange={(e) => setExpiryReminderDays(e.target.value)}
                    className="max-w-xs h-9 text-base"
                    placeholder="7"
                  />
                </div>
              )}

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Payment Due</Label>
                  <p className="text-xs text-muted-foreground/80">Pending payments</p>
                </div>
                <Switch
                  checked={notifications.paymentDue}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, paymentDue: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">New Members</Label>
                  <p className="text-xs text-muted-foreground/80">When members join</p>
                </div>
                <Switch
                  checked={notifications.newMember}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, newMember: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Daily Reports</Label>
                  <p className="text-xs text-muted-foreground/80">Attendance & revenue</p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, dailyReport: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Weekly Summary</Label>
                  <p className="text-xs text-muted-foreground/80">Every Monday</p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Monthly Reports</Label>
                  <p className="text-xs text-muted-foreground/80">1st of each month</p>
                </div>
                <Switch
                  checked={notifications.monthlyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, monthlyReport: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management */}
        <TabsContent value="staff" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Admin & Staff Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Manage admins and trainers who won't appear in member lists
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-900/50">
                <div className="flex gap-2.5">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Admin & Staff Accounts
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Admins and trainers registered here will not appear in members or attendance lists
                    </p>
                  </div>
                </div>
              </div>

              <AddStaffDialog />

              {/* List of existing staff */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Current Staff</Label>
                <StaffList />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biometric Integration */}
        <TabsContent value="biometric" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">ESSL Biometric</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Device integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="device-ip" className="text-xs sm:text-sm font-medium">Device IP</Label>
                  <Input
                    id="device-ip"
                    value={esslDeviceIp}
                    onChange={(e) => setEsslDeviceIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="h-9 text-base font-mono"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    Local network IP
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sync-interval" className="text-xs sm:text-sm font-medium">Sync Interval</Label>
                  <Select value={syncInterval} onValueChange={setSyncInterval}>
                    <SelectTrigger id="sync-interval" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every 1 min</SelectItem>
                      <SelectItem value="5">Every 5 mins</SelectItem>
                      <SelectItem value="10">Every 10 mins</SelectItem>
                      <SelectItem value="30">Every 30 mins</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground/70">
                    Attendance sync rate
                  </p>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Auto-Sync</Label>
                  <p className="text-xs text-muted-foreground/80">Automatic attendance sync</p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-900/50 mt-3">
                <div className="flex gap-2.5">
                  <Fingerprint className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Device: Connected
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Last sync: 2m ago • Next: 3m
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Attendance Rules</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Check-in policies and tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label className="text-sm font-medium">Manual Check-In</Label>
                  <p className="text-xs text-muted-foreground/80">Admins mark attendance</p>
                </div>
                <Switch
                  checked={allowManualCheckIn}
                  onCheckedChange={setAllowManualCheckIn}
                />
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5">
                <Label htmlFor="attendance-grace" className="text-xs sm:text-sm font-medium">Grace Period (Minutes)</Label>
                <Input
                  id="attendance-grace"
                  type="number"
                  inputMode="numeric"
                  value={attendanceGracePeriod}
                  onChange={(e) => setAttendanceGracePeriod(e.target.value)}
                  className="max-w-xs h-9 text-base"
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground/70">
                  Late check-in allowed after opening
                </p>
              </div>

              <Separator className="my-2" />

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900/50">
                <div className="flex gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Tracking Active
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Real-time from biometric device
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Report Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Automated reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-1.5">
                <Label htmlFor="report-email" className="text-xs sm:text-sm font-medium">Send To</Label>
                <Input
                  id="report-email"
                  type="email"
                  defaultValue=""
                  placeholder="admin@yourgym.com"
                  className="h-9 text-base"
                />
                <p className="text-xs text-muted-foreground/70">
                  Automated report email
                </p>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5">
                <Label htmlFor="report-format" className="text-xs sm:text-sm font-medium">Format</Label>
                <Select defaultValue="pdf">
                  <SelectTrigger id="report-format" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Include</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-revenue" defaultChecked className="rounded h-4 w-4" />
                    <label htmlFor="include-revenue" className="text-sm">Revenue & Payments</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-attendance" defaultChecked className="rounded h-4 w-4" />
                    <label htmlFor="include-attendance" className="text-sm">Attendance Stats</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-members" defaultChecked className="rounded h-4 w-4" />
                    <label htmlFor="include-members" className="text-sm">Member Growth</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-expiry" defaultChecked className="rounded h-4 w-4" />
                    <label htmlFor="include-expiry" className="text-sm">Upcoming Expiries</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-lg font-semibold">Admin Profile</CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-snug">
                Personal information and account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-name" className="text-xs sm:text-sm font-medium">Full Name</Label>
                  <Input
                    id="admin-name"
                    placeholder="John Doe"
                    defaultValue="Admin User"
                    className="h-9 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-email" className="text-xs sm:text-sm font-medium">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@gym.com"
                    defaultValue=""
                    className="h-9 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-phone" className="text-xs sm:text-sm font-medium">Phone</Label>
                  <Input
                    id="admin-phone"
                    type="tel"
                    placeholder="+91 XXXXXXXXXX"
                    defaultValue=""
                    className="h-9 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-role" className="text-xs sm:text-sm font-medium">Role</Label>
                  <Input
                    id="admin-role"
                    defaultValue="Administrator"
                    disabled
                    className="h-9 text-base bg-muted"
                  />
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password" className="text-xs sm:text-sm font-medium">Current</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Current password"
                      className="h-9 text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs sm:text-sm font-medium">New</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="New password"
                      className="h-9 text-base"
                    />
                  </div>
                </div>

                <Button variant="outline" size="sm" className="h-9">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile Sticky Save Button */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-background/98 backdrop-blur-md border-t z-50">
        <Button onClick={handleSave} disabled={isSaving} variant="outline" className="w-full h-10 border-primary/20 hover:bg-primary/5">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
