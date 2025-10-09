"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-provider";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(3, { message: "Plan name must be at least 3 characters." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  durationInDays: z.coerce.number().positive().int({ message: "Duration must be a positive integer." }),
  features: z.string().min(10, { message: "Please list at least one feature." }),
});

export function NewPlanForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      durationInDays: 30,
      features: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "Not authenticated or database not available." });
        return;
    }
    setIsLoading(true);
    
    const newPlanData = {
        ...values,
        features: values.features.split('\\n').map(f => f.trim()).filter(f => f),
        status: 'active', // New plans are active by default
        createdBy: user.id,
        createdAt: serverTimestamp(),
    };

    const plansCollectionRef = collection(firestore, 'membershipPlans');
    addDocumentNonBlocking(plansCollectionRef, newPlanData)
        .then(() => {
            toast({
              title: "Plan Created!",
              description: `${values.name} has been successfully added.`,
            });
            router.push("/dashboard/plans");
        })
        .catch(() => {
            // Error is handled by the global error emitter
        })
        .finally(() => {
            setIsLoading(false);
        });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Premium Yearly" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Price ({String.fromCharCode(8377)})</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="12000" {...field} />
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
                        <FormLabel>Duration (in days)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="365" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                            <Textarea placeholder="List each feature on a new line." {...field} />
                        </FormControl>
                         <FormDescription>
                            Enter each feature on a new line. They will be displayed as a list.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Plan
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
