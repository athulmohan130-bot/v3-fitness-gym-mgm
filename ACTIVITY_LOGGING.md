# Activity Logging System

## Overview

The activity logging system provides a comprehensive audit trail of all important actions across V3 Fitness. All activities are stored in Firestore and displayed in the Billing & Activity page.

## Features

- **Complete Audit Trail**: Track all payments, member actions, and plan changes
- **User Attribution**: See who performed each action
- **Searchable & Filterable**: Find specific activities quickly
- **Timeline View**: Chronological display of all events
- **Activity Stats**: Quick overview of activity types

## Activity Types

1. **payment** - Payment transactions
2. **member_added** - New member registration
3. **member_updated** - Member profile updates
4. **member_deleted** - Member removal
5. **membership_renewed** - Membership plan renewal
6. **membership_frozen** - Membership freeze period
7. **plan_created** - New membership plan creation
8. **plan_updated** - Membership plan updates

## Usage

### Import the Logger

```tsx
import {
  logPayment,
  logMemberAdded,
  logMemberUpdated,
  logMemberDeleted,
  logMembershipRenewed,
  logMembershipFrozen,
  logPlanCreated,
  logPlanUpdated,
} from "@/lib/activity-logger";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/lib/auth-provider";
```

### Log a Payment

```tsx
const firestore = useFirestore();
const { user } = useAuth();

// After successful payment
await logPayment(firestore, {
  userId: member.id,
  userName: member.name,
  userEmail: member.email,
  amount: 1200,
  planName: "Premium Monthly",
  performedBy: user.id,
  performedByName: user.name,
});
```

### Log Member Addition

```tsx
// After creating a new member
await logMemberAdded(firestore, {
  userId: newMember.id,
  userName: newMember.name,
  userEmail: newMember.email,
  performedBy: user.id,
  performedByName: user.name,
});
```

### Log Membership Renewal

```tsx
// After renewing membership
await logMembershipRenewed(firestore, {
  userId: member.id,
  userName: member.name,
  userEmail: member.email,
  planName: "Premium Yearly",
  amount: 12000,
  validTill: "January 24th, 2026",
  performedBy: user.id,
  performedByName: user.name,
});
```

### Log Membership Freeze

```tsx
// After freezing membership
await logMembershipFrozen(firestore, {
  userId: member.id,
  userName: member.name,
  userEmail: member.email,
  freezeStart: "Dec 1, 2025",
  freezeEnd: "Dec 15, 2025",
  performedBy: user.id,
  performedByName: user.name,
});
```

### Log Plan Creation

```tsx
// After creating a new plan
await logPlanCreated(firestore, {
  planId: newPlan.id,
  planName: "Premium Yearly",
  price: 12000,
  duration: 365,
  performedBy: user.id,
  performedByName: user.name,
});
```

### Custom Activity (Advanced)

```tsx
import { logActivity } from "@/lib/activity-logger";

await logActivity({
  firestore,
  type: "member_updated",
  description: "Custom activity description",
  userId: "user-id",
  userName: "John Doe",
  userEmail: "john@example.com",
  performedBy: user.id,
  performedByName: user.name,
  amount: 1000, // optional
  metadata: { key: "value" }, // optional
});
```

## Integration Points

### Where to Add Logging

1. **New Member Form** (`new-member-form.tsx`)
   - Call `logMemberAdded()` after successful member creation

2. **Edit Member Form** (`edit-member-form.tsx`)
   - Call `logMemberUpdated()` after successful update

3. **Member Deletion** (`columns.tsx`)
   - Call `logMemberDeleted()` after successful deletion

4. **Membership Renewal** (`renew-plan-dialogue.tsx`)
   - Call `logMembershipRenewed()` after successful renewal
   - Already includes payment logging

5. **Payment Submission** (`view/[id]/page.tsx`)
   - Call `logPayment()` after successful payment

6. **Membership Freeze** (`view/[id]/page.tsx`)
   - Call `logMembershipFrozen()` after freeze submission

7. **Plan Creation** (`new-plan-form.tsx`)
   - Call `logPlanCreated()` after successful plan creation

8. **Plan Update** (`edit-plan-form.tsx`)
   - Call `logPlanUpdated()` after successful update

## Best Practices

1. **Always await logging calls**: Don't fire-and-forget
```tsx
// Good
await logPayment(...);

// Bad - logs might not complete
logPayment(...);
```

2. **Log after success**: Only log completed actions
```tsx
try {
  await performAction();
  await logActivity(...); // Log only after success
} catch (error) {
  // Don't log failed actions
}
```

3. **Include user context**: Always pass performedBy info
```tsx
const { user } = useAuth();

await logActivity({
  ...
  performedBy: user.id,
  performedByName: user.name,
});
```

4. **Use helper functions**: Prefer specific helpers over generic `logActivity()`
```tsx
// Good
await logPayment(firestore, {...});

// Less preferred
await logActivity({ type: "payment", ... });
```

5. **Don't block UI**: Logging failures shouldn't affect user experience
   - The logger already handles errors gracefully
   - Failed logs only show console errors

## Firestore Structure

Activity logs are stored in the `activityLogs` collection:

```typescript
{
  type: "payment" | "member_added" | ...,
  description: "Human-readable description",
  userId?: string,
  userName?: string,
  userEmail?: string,
  performedBy: string,
  performedByName?: string,
  amount?: number,
  metadata?: Record<string, any>,
  timestamp: Timestamp
}
```

## Viewing Activity Logs

Navigate to **Billing & Activity** page and click the **Activity Log** tab to view all activities.

Features:
- **Search**: Find activities by description, member name, or performer
- **Filter by Type**: Show only specific activity types
- **Stats**: Quick overview of activity counts
- **Timeline**: Chronological list with timestamps
- **Load More**: Pagination for large activity sets

## Future Enhancements

- Export activity logs to CSV
- Email notifications for critical activities
- Activity dashboard widgets
- Per-member activity history
- Advanced filtering (date range, amount range)
- Activity retention policies
