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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MembershipPlan } from "@/lib/types";
import { cn } from "@/lib/utils"; // optional: classNames helper
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Select } from "@radix-ui/react-select";

interface RenewPlanDialogProps {
  memberId: string;
  currentEndDate: string;
  availablePlans: MembershipPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenewPlanDialog({
  memberId,
  currentEndDate,
  availablePlans,
  open,
  onOpenChange,
}: RenewPlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<MembershipPlan | null>(null);
  const [startDate, setStartDate] = React.useState<Date | undefined>(parseISO(currentEndDate));
  const { toast } = useToast();

  const endDate = selectedPlan && startDate
    ? addDays(startDate, selectedPlan.durationInDays)
    : null;

  React.useEffect(() => {
    if (!open) {
      setSelectedPlan(null);
      setStartDate(parseISO(currentEndDate));
    }
  }, [open, currentEndDate]);

  const handleSubmit = () => {
    if (!selectedPlan || !startDate || !endDate) return;

    toast({
      title: "Membership Renewed 🎉",
      description: `Plan: ${selectedPlan.name}, valid till ${format(endDate, "PPP")}`,
    });

    onOpenChange(false);
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
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — {plan.durationInDays} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  onSelect={(date)=>setStartDate(date || undefined)}
                  defaultMonth={startDate || new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
            <Button variant="outline" className="w-full text-left cursor-not-allowed">
              {endDate ? format(endDate, "PPP") : "Select start date first"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedPlan || !startDate}>
            Confirm Renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}