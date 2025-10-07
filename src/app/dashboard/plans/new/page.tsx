'use client';
import { NewPlanForm } from "@/components/dashboard/plans/new-plan-form";

export default function NewPlanPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Add New Membership Plan</h1>
          <p className="text-muted-foreground">Fill out the form below to create a new plan.</p>
        </div>
      <NewPlanForm />
    </div>
  );
}
