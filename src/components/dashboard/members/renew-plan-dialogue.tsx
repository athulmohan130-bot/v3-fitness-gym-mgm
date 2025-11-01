"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, addDays, parseISO } from "date-fns";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { MembershipPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestore } from "@/firebase";
import { doc, getDoc, serverTimestamp, updateDoc, collection, addDoc, runTransaction, increment } from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { logMembershipRenewed } from "@/lib/activity-logger";
import { useAuth } from "@/lib/auth-provider";
import { calculateProratedAmount, getPlanChangeType, type ProrationCalculation } from "@/lib/plan-proration";
import { differenceInDays, parseISO as parseISODate, isBefore } from "date-fns";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface RenewPlanDialogProps {
  memberId: string;
  memberName: string;
  currentEndDate: string;
  currentPlanId?: string; // Current active plan ID
  currentPlanPrice?: number; // Current plan price for proration
  currentPlanDuration?: number; // Current plan duration in days
  availablePlans: MembershipPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RenewPlanDialog({
  memberId,
  memberName,
  currentEndDate,
  currentPlanId,
  currentPlanPrice,
  currentPlanDuration,
  availablePlans,
  open,
  onOpenChange,
  onSuccess,
}: RenewPlanDialogProps) {
  // Debug: Log props when dialog opens
  React.useEffect(() => {
    if (open) {
      console.log('🔧 RenewPlanDialog opened with props:', {
        memberId,
        memberName,
        currentEndDate,
        currentPlanId,
        currentPlanPrice,
        currentPlanDuration,
        availablePlansCount: availablePlans?.length
      });
    }
  }, [open, memberId, currentPlanId, currentPlanPrice, currentPlanDuration]);

  const [selectedPlan, setSelectedPlan] = React.useState<MembershipPlan | null>(
    null
  );
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    currentEndDate ? parseISO(currentEndDate) : new Date()
  );
  const [paidAmount, setPaidAmount] = React.useState<number | undefined>();
  const [paymentMode, setPaymentMode] = React.useState<string>("cash");
  const [prorationCalc, setProrationCalc] = React.useState<ProrationCalculation | null>(null);
  const { toast } = useNotificationToast();
  const firestore = useFirestore();
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();

  const { mutate: renewMembership, isPending } = useMutation({
    mutationFn: async ({ plan, start, end, amount, mode }: { plan: MembershipPlan, start: Date, end: Date, amount?: number, mode: string }) => {
      if (!firestore) throw new Error("Firestore not available");

      const historyCollectionRef = collection(firestore, "users", memberId, "membershipHistory");
      
      const newHistoryEntry = {
        membershipPlanId: plan.id,
        membershipPlan: plan.name,
        membershipStart: start.toISOString(),
        membershipEnd: end.toISOString(),
        price: plan.price || 0,
        paidAmount: amount || 0,
        paymentMode: mode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      return runTransaction(firestore, async (transaction) => {
        // All reads must come before all writes.
        const revenueSummaryRef = doc(firestore, "stats/revenueSummary");
        const revenueSummaryDoc = await transaction.get(revenueSummaryRef);

        // Now, perform all write operations.
        // 1. Add new membership history
        const newHistoryRef = doc(historyCollectionRef);
        transaction.set(newHistoryRef, newHistoryEntry);

        // 2. Create payment record (for payment history)
        const paidAmount = amount || 0;
        if (paidAmount > 0) {
          const paymentsRef = collection(firestore, "payments");
          const newPaymentRef = doc(paymentsRef);
          transaction.set(newPaymentRef, {
            userId: memberId,
            planId: plan.id,
            amount: paidAmount,
            paymentDate: serverTimestamp(),
            mode: mode.toUpperCase() as "UPI" | "CARD" | "CASH",
            status: "success",
            month: format(start, 'yyyy-MM'),
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            handledBy: adminUser?.name || adminUser?.email || "Admin",
          });
        }

        // 3. Revenue Summary Write
        if (paidAmount > 0) {
          const monthKey = format(start, 'yyyy-MM');
          if (!revenueSummaryDoc.exists()) {
            transaction.set(revenueSummaryRef, {
              totalRevenueAllTime: paidAmount,
              monthlyRevenue: { [monthKey]: paidAmount },
              lastUpdated: serverTimestamp(),
            });
          } else {
            transaction.update(revenueSummaryRef, {
              totalRevenueAllTime: increment(paidAmount),
              [`monthlyRevenue.${monthKey}`]: increment(paidAmount),
              lastUpdated: serverTimestamp(),
            });
          }
        }
      });
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Membership Renewed 🎉",
        description: `${memberName}'s membership has been renewed with ${variables.plan.name} plan, valid till ${format(variables.end, "PPP")}`,
      });
      
      // Log activity
      if (firestore && adminUser) {
        await logMembershipRenewed(firestore, {
          userId: memberId,
          userName: memberName,
          userEmail: "", // We'll need to get this from the member data
          planName: variables.plan.name,
          amount: variables.amount || variables.plan.price,
          validTill: format(variables.end, "PPP"),
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["revenueSummary"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      onSuccess(); // This will now reliably trigger invalidation
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating renewal:", error);
      toast({
        title: "Error",
        description: "Failed to renew membership. Please try again.",
        variant: "destructive",
      });
    },
  });

  const endDate =
    selectedPlan && startDate
      ? addDays(startDate, selectedPlan.durationInDays)
      : null;

  // Calculate proration when plan selection changes
  React.useEffect(() => {
    console.log('💰 Proration calculation triggered:', {
      selectedPlan: selectedPlan?.name,
      currentPlanPrice,
      currentPlanDuration,
      currentEndDate,
      hasAllData: !!(selectedPlan && currentPlanPrice && currentPlanDuration && currentEndDate)
    });

    if (selectedPlan && currentPlanPrice && currentPlanDuration && currentEndDate) {
      const now = new Date();
      const endDate = parseISODate(currentEndDate);
      const isEarlyUpgrade = isBefore(now, endDate);
      
      console.log('📅 Date check:', {
        now: now.toISOString(),
        endDate: endDate.toISOString(),
        isEarlyUpgrade
      });
      
      // Only calculate proration if it's an early upgrade
      if (isEarlyUpgrade) {
        const calc = calculateProratedAmount(
          currentPlanPrice,
          currentPlanDuration,
          currentEndDate,
          selectedPlan.price,
          selectedPlan.durationInDays
        );
        console.log('✅ Proration calculated:', calc);
        setProrationCalc(calc);
        setPaidAmount(calc.finalPayableAmount);
      } else {
        console.log('⏰ Plan expired - no proration');
        // Plan expired, no proration
        setProrationCalc(null);
        setPaidAmount(selectedPlan.price);
      }
    } else {
      console.log('❌ Missing data for proration calculation');
      setProrationCalc(null);
      if (selectedPlan) {
        setPaidAmount(selectedPlan.price);
      }
    }
  }, [selectedPlan, currentPlanPrice, currentPlanDuration, currentEndDate]);

  React.useEffect(() => {
    if (open) {
      setStartDate(currentEndDate ? parseISO(currentEndDate) : new Date());
      setSelectedPlan(null);
      setPaidAmount(undefined);
      setPaymentMode("cash");
      setProrationCalc(null);
    } else {
      setSelectedPlan(null);
      setStartDate(currentEndDate ? parseISO(currentEndDate) : new Date());
      setProrationCalc(null);
    }
  }, [open, currentEndDate]);

  const handleSubmit = () => {
    if (!selectedPlan || !startDate || !endDate) return;
    renewMembership({ plan: selectedPlan, start: startDate, end: endDate, amount: paidAmount, mode: paymentMode });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renew Membership</DialogTitle>
          <DialogDescription>
            Select a plan, start date, and confirm renewal for this member.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Plan selection */}
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <Select
              value={selectedPlan?.id || ""}
              onValueChange={(value) => {
                const plan = availablePlans.find((p) => p.id === value) || null;
                setSelectedPlan(plan);
                setPaidAmount(plan?.price);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — ₹{plan.price} for {plan.durationInDays} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="space-y-2">
              <Label>Plan Price</Label>
              <Input value={`₹${selectedPlan.price}`} disabled />
            </div>
          )}

          {/* Proration Breakdown */}
          {prorationCalc && prorationCalc.isEarlyUpgrade && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm space-y-3 ml-1">
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Early Upgrade Discount Applied! 🎉
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {prorationCalc.upgradeMessage}
                  </p>
                </div>
                
                <Separator className="bg-blue-200 dark:bg-blue-800" />
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300">New Plan Price:</span>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">₹{prorationCalc.newPlanPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                    <span>Unused Value Discount:</span>
                    <span className="font-semibold">- ₹{prorationCalc.proratedDiscount}</span>
                  </div>
                  <Separator className="bg-blue-200 dark:bg-blue-800" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-900 dark:text-blue-100">You Pay:</span>
                    <span className="font-bold text-lg text-blue-900 dark:text-blue-100">₹{prorationCalc.finalPayableAmount}</span>
                  </div>
                  {prorationCalc.savingsPercentage > 0 && (
                    <p className="text-center text-green-600 dark:text-green-400 font-medium pt-1">
                      You save {prorationCalc.savingsPercentage}% on this upgrade!
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paid Amount</Label>
              <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} placeholder="Enter amount paid" />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                  disabled={!selectedPlan} // only enable after plan selected
                >
                  {startDate ? format(startDate, "PPP") : "Pick a start date"}
                  <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => setStartDate(date || undefined)}
                  initialFocus
                  captionLayout="dropdown-buttons" // ⬅️ shows month/year controls
                  fromYear={2000} // ⬅️ start year
                  toYear={2030} // ⬅️ end year
                  defaultMonth={startDate || new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
            <Button
              variant="outline"
              className="w-full text-left cursor-not-allowed"
            >
              {endDate ? format(endDate, "PPP") : "Select start date first"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlan || !startDate || isPending}
          >
            {isPending ? "Renewing..." : "Confirm Renewal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
