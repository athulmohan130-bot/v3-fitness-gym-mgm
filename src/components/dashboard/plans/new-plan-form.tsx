"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/lib/auth-provider";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { planSchema, PlanFormData } from "@/lib/validators/plan";

export function NewPlanForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useNotificationToast();
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      price: 0,
      durationInDays: 30,
      features: [{ value: "" }],
      status: "active",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features",
  });

  const onSubmit = async (data: PlanFormData) => {
    if (!firestore || !user) {
      toast({
        title: "Error",
        description: "Not authenticated or database connection not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const newPlanData = {
        ...data,
        createdBy: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const plansCollectionRef = collection(firestore, "membershipPlans");
      await addDoc(plansCollectionRef, newPlanData);

      toast({
        title: "Success!",
        description: `${data.name} has been created successfully.`,
        variant: "default",
      });

      router.push("/dashboard/plans");
    } catch (error) {
      console.error("Error creating plan:", error);
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label>Plan Name</Label>
                    <FormControl>
                      <Input placeholder="e.g., Premium Membership" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Price (₹)</Label>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationInDays"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Duration (days)</Label>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <FormField
                      control={form.control}
                      key={field.id}
                      name={`features.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., 24/7 Gym Access"
                                aria-label={`Feature ${index + 1}`}
                              />
                            </FormControl>
                            {fields.length > 1 && (
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
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  {form.formState.errors.features && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.features.root?.message}
                    </p>
                  )}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Plan
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
