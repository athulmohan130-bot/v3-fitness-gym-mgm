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
import { useToast } from "@/hooks/use-toast";
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

interface RenewPlanDialogProps {
  memberId: string;
  currentEndDate: string;
  availablePlans: MembershipPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RenewPlanDialog({
  memberId,
  currentEndDate,
  availablePlans,
  open,
  onOpenChange,
  onSuccess,
}: RenewPlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<MembershipPlan | null>(
    null
  );
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    currentEndDate ? parseISO(currentEndDate) : new Date()
  );
  const [paidAmount, setPaidAmount] = React.useState<number | undefined>();
  const [paymentMode, setPaymentMode] = React.useState<string>("cash");
  const { toast } = useToast();
  const firestore = useFirestore();
  const queryClient = useQueryClient();

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

        // 2. Revenue Summary Write
        const paidAmount = amount || 0;
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
    onSuccess: (_, variables) => {
      toast({
        title: "Membership Renewed 🎉",
        description: `Plan: ${variables.plan.name}, valid till ${format(variables.end, "PPP")}`,
      });
      queryClient.invalidateQueries({ queryKey: ["revenueSummary"] });
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

  React.useEffect(() => {
    if (open) {
      setStartDate(currentEndDate ? parseISO(currentEndDate) : new Date());
      setSelectedPlan(null);
      setPaidAmount(undefined);
      setPaymentMode("cash");
    } else {
      setSelectedPlan(null);
      setStartDate(currentEndDate ? parseISO(currentEndDate) : new Date());
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
