"use client";

import { ActivityLog } from "@/components/dashboard/billing/activity-log";

export default function ActivityLogPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete audit trail of all actions across V3 Fitness</p>
        </div>
      </div>

      <ActivityLog />
    </div>
  );
}
