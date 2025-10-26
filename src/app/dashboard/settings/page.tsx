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
  Building2,
  CreditCard,
  Bell,
  Fingerprint,
  ClipboardList,
  BarChart3,
  User,
  Save,
  Clock
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // Gym Information
  const [gymName, setGymName] = useState("FitLife Gym");
  const [gymAddress, setGymAddress] = useState("123 Fitness Street, Kerala");
  const [gymPhone, setGymPhone] = useState("+91 9876543210");
  const [gymEmail, setGymEmail] = useState("admin@fitlifegym.com");
  const [operatingHours, setOperatingHours] = useState("6:00 AM - 10:00 PM");

  // Billing & Payments
  const [lateFeeAmount, setLateFeeAmount] = useState("100");
  const [gracePeriodDays, setGracePeriodDays] = useState("3");
  const [autoSuspendAfterDays, setAutoSuspendAfterDays] = useState("7");
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    upi: true,
    card: false,
    netBanking: false
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    expiryReminder: true,
    paymentDue: true,
    newMember: true,
    dailyReport: false,
    weeklyReport: true,
    monthlyReport: true
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
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0 max-w-full overflow-hidden">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <Button onClick={handleSave} disabled={isSaving} className="hidden sm:flex w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground hidden sm:block">
          Manage your gym settings, preferences, and configurations
        </p>
      </div>

      <Tabs defaultValue="gym" className="space-y-4 sm:space-y-6">
        <div className="w-full overflow-x-auto overflow-y-visible sm:overflow-visible scrollbar-hide">
          <TabsList className="inline-flex sm:grid sm:w-full grid-cols-4 lg:grid-cols-7 gap-1 w-max sm:w-full justify-start sm:justify-center">
            <TabsTrigger value="gym" className="whitespace-nowrap flex-shrink-0">
              <Building2 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Gym Info
            </TabsTrigger>
            <TabsTrigger value="billing" className="whitespace-nowrap flex-shrink-0">
              <CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap flex-shrink-0">
              <Bell className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="biometric" className="whitespace-nowrap flex-shrink-0">
              <Fingerprint className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Biometric
            </TabsTrigger>
            <TabsTrigger value="attendance" className="whitespace-nowrap flex-shrink-0">
              <ClipboardList className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="reports" className="whitespace-nowrap flex-shrink-0">
              <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0">
              <User className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Profile
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Gym Information */}
        <TabsContent value="gym" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Gym Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Basic information about your gym that appears on receipts and member communications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gym-name">Gym Name</Label>
                  <Input
                    id="gym-name"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Enter gym name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-phone">Contact Phone</Label>
                  <Input
                    id="gym-phone"
                    value={gymPhone}
                    onChange={(e) => setGymPhone(e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-email">Email Address</Label>
                  <Input
                    id="gym-email"
                    type="email"
                    value={gymEmail}
                    onChange={(e) => setGymEmail(e.target.value)}
                    placeholder="admin@yourgym.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operating-hours">Operating Hours</Label>
                  <Input
                    id="operating-hours"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="6:00 AM - 10:00 PM"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gym-address">Address</Label>
                <Textarea
                  id="gym-address"
                  value={gymAddress}
                  onChange={(e) => setGymAddress(e.target.value)}
                  placeholder="Enter complete gym address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Payments */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Payment Methods</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Enable payment methods accepted at your gym
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cash Payments</Label>
                  <p className="text-sm text-muted-foreground">Accept cash payments</p>
                </div>
                <Switch
                  checked={paymentMethods.cash}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, cash: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>UPI Payments</Label>
                  <p className="text-sm text-muted-foreground">Accept UPI/QR code payments</p>
                </div>
                <Switch
                  checked={paymentMethods.upi}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, upi: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Card Payments</Label>
                  <p className="text-sm text-muted-foreground">Accept credit/debit cards</p>
                </div>
                <Switch
                  checked={paymentMethods.card}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, card: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Net Banking</Label>
                  <p className="text-sm text-muted-foreground">Accept online bank transfers</p>
                </div>
                <Switch
                  checked={paymentMethods.netBanking}
                  onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, netBanking: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Late Payment Policies</CardTitle>
              <CardDescription>
                Configure late payment fees and grace periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="late-fee">Late Fee Amount (₹)</Label>
                  <Input
                    id="late-fee"
                    type="number"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(e.target.value)}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Charged after grace period expires
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grace-period">Grace Period (Days)</Label>
                  <Input
                    id="grace-period"
                    type="number"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(e.target.value)}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Days before late fee applies
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-suspend">Auto-Suspend After (Days)</Label>
                  <Input
                    id="auto-suspend"
                    type="number"
                    value={autoSuspendAfterDays}
                    onChange={(e) => setAutoSuspendAfterDays(e.target.value)}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">
                    Suspend membership if unpaid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email & SMS Notifications</CardTitle>
              <CardDescription>
                Configure automatic notifications for members and admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Membership Expiry Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders before membership expires
                  </p>
                </div>
                <Switch
                  checked={notifications.expiryReminder}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, expiryReminder: checked })}
                />
              </div>

              {notifications.expiryReminder && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="expiry-days">Remind Before (Days)</Label>
                  <Input
                    id="expiry-days"
                    type="number"
                    value={expiryReminderDays}
                    onChange={(e) => setExpiryReminderDays(e.target.value)}
                    className="max-w-xs"
                    placeholder="7"
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Payment Due Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify members about pending payments
                  </p>
                </div>
                <Switch
                  checked={notifications.paymentDue}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, paymentDue: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Member Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new members join
                  </p>
                </div>
                <Switch
                  checked={notifications.newMember}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, newMember: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily attendance and revenue reports
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, dailyReport: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly performance summary every Monday
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Monthly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive monthly reports on 1st of month
                  </p>
                </div>
                <Switch
                  checked={notifications.monthlyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, monthlyReport: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biometric Integration */}
        <TabsContent value="biometric" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ESSL Biometric Device</CardTitle>
              <CardDescription>
                Configure biometric device integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-ip">Device IP Address</Label>
                  <Input
                    id="device-ip"
                    value={esslDeviceIp}
                    onChange={(e) => setEsslDeviceIp(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Local network IP of ESSL device
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync-interval">Auto-Sync Interval (Minutes)</Label>
                  <Select value={syncInterval} onValueChange={setSyncInterval}>
                    <SelectTrigger id="sync-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every 1 minute</SelectItem>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="10">Every 10 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to sync attendance data
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync attendance from biometric device
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <div className="flex gap-3">
                  <Fingerprint className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      Device Status: Connected
                    </p>
                    <p className="text-xs text-blue-700">
                      Last synced: 2 minutes ago • Next sync in 3 minutes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Policies</CardTitle>
              <CardDescription>
                Configure check-in rules and attendance tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Manual Check-In</Label>
                  <p className="text-sm text-muted-foreground">
                    Admins can manually mark attendance for members
                  </p>
                </div>
                <Switch
                  checked={allowManualCheckIn}
                  onCheckedChange={setAllowManualCheckIn}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="attendance-grace">Late Check-In Grace Period (Minutes)</Label>
                <Input
                  id="attendance-grace"
                  type="number"
                  value={attendanceGracePeriod}
                  onChange={(e) => setAttendanceGracePeriod(e.target.value)}
                  className="max-w-xs"
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Members can check in this many minutes after opening time
                </p>
              </div>

              <Separator />

              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">
                      Attendance Tracking Active
                    </p>
                    <p className="text-xs text-amber-700">
                      Real-time attendance is being recorded from biometric device
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>
                Configure automated reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-email">Send Reports To</Label>
                <Input
                  id="report-email"
                  type="email"
                  value={gymEmail}
                  onChange={(e) => setGymEmail(e.target.value)}
                  placeholder="admin@yourgym.com"
                />
                <p className="text-xs text-muted-foreground">
                  Email address for receiving automated reports
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="report-format">Report Format</Label>
                <Select defaultValue="pdf">
                  <SelectTrigger id="report-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Report Includes</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-revenue" defaultChecked className="rounded" />
                    <label htmlFor="include-revenue" className="text-sm">Revenue & Payments</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-attendance" defaultChecked className="rounded" />
                    <label htmlFor="include-attendance" className="text-sm">Attendance Statistics</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-members" defaultChecked className="rounded" />
                    <label htmlFor="include-members" className="text-sm">Member Growth</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="include-expiry" defaultChecked className="rounded" />
                    <label htmlFor="include-expiry" className="text-sm">Upcoming Expiries</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Profile</CardTitle>
              <CardDescription>
                Manage your personal information and account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Full Name</Label>
                  <Input
                    id="admin-name"
                    placeholder="John Doe"
                    defaultValue="Admin User"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@gym.com"
                    defaultValue={gymEmail}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-phone">Phone Number</Label>
                  <Input
                    id="admin-phone"
                    placeholder="+91 XXXXXXXXXX"
                    defaultValue={gymPhone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-role">Role</Label>
                  <Input
                    id="admin-role"
                    defaultValue="Administrator"
                    disabled
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile Sticky Save Button */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
        <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
