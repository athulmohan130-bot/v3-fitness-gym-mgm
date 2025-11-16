"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { Loader2, Save, X } from "lucide-react";
import { MembershipPlan } from "@/lib/types";
import { planSchema, PlanFormData } from "@/lib/validators/plan";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface EditPlanFormProps {
  plan: MembershipPlan;
}

export function EditPlanForm({ plan }: EditPlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useNotificationToast();
  const router = useRouter();
  const firestore = useFirestore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    setValue,
    watch,
    reset,
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan.name,
      type: plan.type || "Cardio",
      price: plan.price,
      registrationFee: plan.registrationFee || 0,
      durationInDays: plan.durationInDays,
      features: plan.features,
      status: plan.status || "active",
    },
  });

  const status = watch("status");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "features",
  });

  const onSubmit = async (data: PlanFormData) => {
    if (!firestore) {
      toast({
        title: "Error",
        description: "Database connection not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const planRef = doc(firestore, "membershipPlans", plan.id);
      await updateDoc(planRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Plan updated successfully!",
        variant: "default",
      });

      reset(data); // Reset form with new values
      router.push("/dashboard/plans");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle>Edit Membership Plan</CardTitle>
          <CardDescription>
            Modify the details for the <span className="font-semibold">{plan.name}</span> plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
          <div>
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Premium Membership"
              className={errors.name ? "border-destructive" : ""}
              aria-invalid={!!errors.name}
              aria-describedby="name-error"
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Plan Type</Label>
            <Select
              value={watch("type")}
              onValueChange={(value) => setValue("type", value as "Cardio" | "Bodybuilding", { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="Bodybuilding">Bodybuilding</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive mt-1">
                {errors.type.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Monthly Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="1"
                max="100000"
                placeholder="e.g., 1500"
                {...register("price", { valueAsNumber: true })}
                className={errors.price ? "border-destructive" : ""}
                aria-invalid={!!errors.price}
                aria-describedby="price-error"
              />
              {errors.price && (
                <p id="price-error" className="text-sm text-destructive mt-1">
                  {errors.price.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum ₹1
              </p>
            </div>

            <div>
              <Label htmlFor="registrationFee">Registration Fee (₹)</Label>
              <Input
                id="registrationFee"
                type="number"
                step="0.01"
                min="0"
                max="50000"
                placeholder="e.g., 500 (optional)"
                {...register("registrationFee", { valueAsNumber: true })}
                className={errors.registrationFee ? "border-destructive" : ""}
                aria-invalid={!!errors.registrationFee}
                aria-describedby="registrationFee-error"
              />
              {errors.registrationFee && (
                <p id="registrationFee-error" className="text-sm text-destructive mt-1">
                  {errors.registrationFee.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional. Leave 0 for no registration fee.
              </p>
            </div>

            <div>
              <Label htmlFor="durationInDays">Duration (days)</Label>
              <Input
                id="durationInDays"
                type="number"
                {...register("durationInDays", { valueAsNumber: true })}
                className={errors.durationInDays ? "border-destructive" : ""}
                aria-invalid={!!errors.durationInDays}
                aria-describedby="duration-error"
              />
              {errors.durationInDays && (
                <p id="duration-error" className="text-sm text-destructive mt-1">
                  {errors.durationInDays.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Features</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
                aria-label="Add feature"
              >
                Add Feature
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register(`features.${index}.value`)}
                      placeholder="e.g., 24/7 Gym Access"
                      aria-label={`Feature ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10"
                      aria-label={`Remove feature ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.features?.[index]?.value?.message && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.features[index].value.message}
                    </p>
                  )}
                </div>
              ))}
              {errors.features?.root && (
                <p className="text-sm text-destructive mt-1">
                  {errors.features.root.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="status" className="text-base">
                Plan Status
              </Label>
              <p className="text-sm text-muted-foreground">
                {status === "active"
                  ? "This plan is currently active and visible to members."
                  : "This plan is inactive and hidden from members."}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={status === "active"}
                onCheckedChange={(checked) =>
                  setValue("status", checked ? "active" : "inactive", { shouldDirty: true })
                }
                aria-label="Toggle plan status"
              />
              <Label htmlFor="status" className="cursor-pointer">
                {status === "active" ? "Active" : "Inactive"}
              </Label>
            </div>
          </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/plans")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
  );
}