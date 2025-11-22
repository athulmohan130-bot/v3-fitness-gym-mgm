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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Search, Download, IndianRupee, CreditCard, Clock, XCircle, ExternalLink, ChevronLeft, ChevronRight, X, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon } from "lucide-react";
import Link from "next/link";
import Currency from "@/components/ui/currency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  paymentDate: string;
  mode: "UPI" | "Card" | "Cash";
  status: "success" | "failed" | "pending";
  month: string;
  transactionId: string;
  handledBy: string;
}

interface GymUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

// Helper to safely parse payment date
function parsePaymentDate(paymentDate: any): Date {
  if (!paymentDate) return new Date();
  
  // Handle Firestore Timestamp
  if (paymentDate.toDate && typeof paymentDate.toDate === 'function') {
    return paymentDate.toDate();
  }
  
  // Handle ISO string or number
  const date = new Date(paymentDate);
  return isNaN(date.getTime()) ? new Date() : date;
}

export default function PaymentHistoryPage() {
  const firestore = useFirestore();

  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: Date; to: Date } | null>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // State for sorting
  const [sortBy, setSortBy] = useState<"date" | "amount" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");


  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterMode("all");
    setSelectedMonth("all");
    setSelectedDate(undefined);
    setDateRangeFilter(null);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || filterMode !== "all" || selectedMonth !== "all" || selectedDate !== undefined || dateRangeFilter !== null;

  // Query all payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "payments"),
      orderBy("paymentDate", "desc")
    );
  }, [firestore]);

  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);

  // Query all users for name lookup
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

  // Get available months from payment data
  const availableMonths = useMemo(() => {
    if (!payments) return [];
    const months = new Set(payments.map(p => p.month));
    return Array.from(months).sort().reverse();
  }, [payments]);

  // Filter and search payments
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    let filtered = [...payments];

    // Search by member name, email, transaction ID, or amount
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => {
        const user = userMap.get(payment.userId);
        return (
          user?.name.toLowerCase().includes(query) ||
          user?.email.toLowerCase().includes(query) ||
          payment.transactionId?.toLowerCase().includes(query) ||
          payment.amount.toString().includes(query)
        );
      });
    }

    // Filter by payment mode
    if (filterMode !== "all") {
      filtered = filtered.filter(payment => payment.mode.toLowerCase() === filterMode);
    }

    // Filter by month
    if (selectedMonth !== "all") {
      filtered = filtered.filter(payment => payment.month === selectedMonth);
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(payment => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        const filterDate = new Date(selectedDate);

        // Compare only the date part (ignore time)
        return (
          paymentDate.getFullYear() === filterDate.getFullYear() &&
          paymentDate.getMonth() === filterDate.getMonth() &&
          paymentDate.getDate() === filterDate.getDate()
        );
      });
    }

    // Filter by date range
    if (dateRangeFilter) {
      filtered = filtered.filter(payment => {
        const paymentDate = parsePaymentDate(payment.paymentDate);
        const from = new Date(dateRangeFilter.from.setHours(0, 0, 0, 0));
        const to = new Date(dateRangeFilter.to.setHours(23, 59, 59, 999));

        return paymentDate >= from && paymentDate <= to;
      });
    }

    // Apply sorting
    if (sortBy === "date") {
      filtered.sort((a, b) => {
        const dateA = parsePaymentDate(a.paymentDate).getTime();
        const dateB = parsePaymentDate(b.paymentDate).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === "amount") {
      filtered.sort((a, b) => {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      });
    }

    return filtered;
  }, [payments, searchQuery, filterMode, selectedMonth, selectedDate, dateRangeFilter, userMap, sortBy, sortOrder]);

  // Paginate payments
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMode, selectedMonth]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!payments) return {
      revenueToday: 0,
      revenueThisMonth: 0,
      revenueAllTime: 0,
      totalTransactions: 0
    };

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const thisMonth = format(today, 'yyyy-MM');

    const successPayments = payments.filter(p => p.status === "success");

    // Revenue today (comparing date only)
    const revenueToday = successPayments
      .filter(p => {
        const paymentDate = parsePaymentDate(p.paymentDate);
        return format(paymentDate, 'yyyy-MM-dd') === todayStr;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Revenue this month
    const revenueThisMonth = successPayments
      .filter(p => p.month === thisMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    // Revenue all time
    const revenueAllTime = successPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalTransactions = payments.length;

    return { revenueToday, revenueThisMonth, revenueAllTime, totalTransactions };
  }, [payments]);

  // Export to CSV
  const handleExport = () => {
    if (!filteredPayments.length) return;

    const headers = ["Date", "Time", "Member Name", "Email", "Amount", "Mode", "Status", "Month"];
    const rows = filteredPayments.map(payment => {
      const user = userMap.get(payment.userId);
      const date = parsePaymentDate(payment.paymentDate);
      return [
        format(date, "dd MMM, yyyy"),
        format(date, "hh:mm a"),
        user?.name || "Unknown",
        user?.email || "N/A",
        payment.amount,
        payment.mode,
        payment.status,
        payment.month,
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (paymentsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Payment History</h1>
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">Payment History</h1>
        <Button onClick={handleExport} disabled={!filteredPayments.length} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Revenue Today */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Revenue Today</p>
                <div className="text-xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-2">
                  <Currency value={stats.revenueToday} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {format(new Date(), "dd MMM, yyyy")}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">This Month</p>
                <div className="text-xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-2">
                  <Currency value={stats.revenueThisMonth} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {format(new Date(), "MMMM yyyy")}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue All Time */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">All Time</p>
                <div className="text-xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-2">
                  <Currency value={stats.revenueAllTime} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  Total revenue
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Transactions</p>
                <div className="text-xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-2">
                  {stats.totalTransactions}
                </div>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  All payment records
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 mb-6">

            {/* Search and Filters Row */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, transaction ID, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && !dateRangeFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd/MM/yyyy")
                    ) : dateRangeFilter ? (
                      `${format(dateRangeFilter.from, "dd/MM/yy")} - ${format(dateRangeFilter.to, "dd/MM/yy")}`
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    {/* Quick Filters Sidebar */}
                    <div className="border-r bg-muted/50">
                      <div className="p-2">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Quick Filters</p>
                        <div className="flex flex-col gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              setSelectedDate(new Date());
                              setDateRangeFilter(null);
                            }}
                          >
                            Today
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              setSelectedDate(subDays(new Date(), 1));
                              setDateRangeFilter(null);
                            }}
                          >
                            Yesterday
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              const today = new Date();
                              setSelectedDate(undefined);
                              setDateRangeFilter({
                                from: subDays(today, 6),
                                to: today,
                              });
                            }}
                          >
                            Last 7 Days
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              const today = new Date();
                              setSelectedDate(undefined);
                              setDateRangeFilter({
                                from: startOfWeek(today, { weekStartsOn: 0 }),
                                to: endOfWeek(today, { weekStartsOn: 0 }),
                              });
                            }}
                          >
                            This Week
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              const today = new Date();
                              setSelectedDate(undefined);
                              setDateRangeFilter({
                                from: startOfMonth(today),
                                to: endOfMonth(today),
                              });
                            }}
                          >
                            This Month
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 px-2 text-sm font-normal"
                            onClick={() => {
                              const lastMonth = subMonths(new Date(), 1);
                              setSelectedDate(undefined);
                              setDateRangeFilter({
                                from: startOfMonth(lastMonth),
                                to: endOfMonth(lastMonth),
                              });
                            }}
                          >
                            Last Month
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Calendar */}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setDateRangeFilter(null);
                      }}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Payment Mode Filter */}
              <Select value={filterMode} onValueChange={setFilterMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>

              {/* Month Filter */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(month + "-01"), "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Search: {searchQuery}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {selectedDate && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Date: {format(selectedDate, "dd/MM/yyyy")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setSelectedDate(undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {dateRangeFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Range: {format(dateRangeFilter.from, "dd/MM/yy")} - {format(dateRangeFilter.to, "dd/MM/yy")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setDateRangeFilter(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filterMode !== "all" && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Mode: {filterMode.toUpperCase()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setFilterMode("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {selectedMonth !== "all" && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Month: {format(new Date(selectedMonth + "-01"), "MMM yyyy")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setSelectedMonth("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredPayments.length}</span> of{" "}
              <span className="font-semibold text-foreground">{payments?.length || 0}</span> payments
            </div>
          </div>

          {/* Payments Table */}
          {paginatedPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? "No matching payments" : "No payment records"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms to find what you're looking for."
                  : "Payment records will appear here once members start making payments."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedPayments.map((payment) => {
                  const user = userMap.get(payment.userId);
                  const paymentDate = parsePaymentDate(payment.paymentDate);

                  return (
                    <Card key={payment.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        {/* Member Info */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user?.profileImageUrl} alt={user?.name} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {user?.name.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user?.name || "Unknown Member"}</div>
                              <div className="text-xs text-muted-foreground">{user?.email || "N/A"}</div>
                            </div>
                          </div>
                          <Badge
                            variant={
                              payment.status === "success"
                                ? "default"
                                : payment.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-semibold shrink-0"
                          >
                            {payment.status === "success" && "✓ "}
                            {payment.status === "failed" && "✗ "}
                            {payment.status === "pending" && "⏳ "}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Payment Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">Amount</div>
                            <div className="font-semibold text-lg">
                              <Currency value={payment.amount} />
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">Date</div>
                            <div>{format(paymentDate, "dd MMM, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">{format(paymentDate, "hh:mm a")}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs mb-1">Mode</div>
                            <Badge variant="outline" className="font-medium">
                              {payment.mode}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {user && (
                          <div className="mt-3">
                            <Button asChild variant="outline" size="sm" className="w-full">
                              <Link href={`/dashboard/members/view/${payment.userId}`}>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Member
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-lg overflow-hidden">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortBy === "date") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("date");
                            setSortOrder("desc");
                          }
                        }}
                        className="h-8 px-2 -ml-2"
                      >
                        Date & Time
                        {sortBy === "date" ? (
                          sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortBy === "amount") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("amount");
                            setSortOrder("desc");
                          }
                        }}
                        className="h-8 px-2 -ml-2"
                      >
                        Amount
                        {sortBy === "amount" ? (
                          sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment) => {
                    const user = userMap.get(payment.userId);
                    const paymentDate = parsePaymentDate(payment.paymentDate);

                    return (
                      <TableRow key={payment.id} className="hover:bg-muted/50">
                        {/* Member Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user?.profileImageUrl} alt={user?.name} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {user?.name.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user?.name || "Unknown Member"}</div>
                              <div className="text-xs text-muted-foreground">{user?.email || "N/A"}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell>
                          <div className="text-sm">{format(paymentDate, "dd MMM, yyyy")}</div>
                          <div className="text-xs text-muted-foreground">{format(paymentDate, "hh:mm a")}</div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <div className="font-semibold">
                            <Currency value={payment.amount} />
                          </div>
                        </TableCell>

                        {/* Payment Mode */}
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {payment.mode}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "success"
                                ? "default"
                                : payment.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-semibold"
                          >
                            {payment.status === "success" && "✓ "}
                            {payment.status === "failed" && "✗ "}
                            {payment.status === "pending" && "⏳ "}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {user && (
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/members/view/${payment.userId}`}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} results
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
        </CardContent>
      </Card>
    </div>
  );
}
