# Early Plan Upgrade with Prorated Pricing - Implementation Guide

## Overview

This document explains the implementation of the early plan upgrade feature with prorated pricing in the V3 Fitness gym management system.

## Feature Description

When a member upgrades to a different plan before their current membership expires, they receive a **prorated discount** based on the unused days of their current plan. This encourages upgrades and provides fair pricing.

## Business Logic

### Calculation Formula

```
unusedValue = (daysRemaining / currentPlanDuration) * currentPlanPrice
proratedDiscount = min(unusedValue, newPlanPrice)
finalPayableAmount = newPlanPrice - proratedDiscount
```

### Example Scenario

**Current Plan:**
- Plan: Gold (₹1,200/month = 30 days)
- Days Remaining: 10 days
- Daily Value: ₹1,200 / 30 = ₹40/day

**New Plan:**
- Plan: Platinum (₹1,500/month)

**Calculation:**
- Unused Value: 10 days × ₹40 = ₹400
- New Plan Price: ₹1,500
- Prorated Discount: ₹400
- **Final Payable: ₹1,500 - ₹400 = ₹1,100** ✅

**Savings: 26.7%**

## Technical Implementation

### 1. Proration Calculation Library

**File:** `/src/lib/plan-proration.ts`

This module contains all proration logic:

**Key Function:**
```typescript
calculateProratedAmount(
  currentPlanPrice: number,
  currentPlanDuration: number,
  currentEndDate: string,
  newPlanPrice: number,
  newPlanDuration: number
): ProrationCalculation
```

**Returns:**
- `unusedValue`: Value of remaining days
- `proratedDiscount`: Discount to apply
- `finalPayableAmount`: Amount user needs to pay
- `savingsPercentage`: Percentage saved
- `isEarlyUpgrade`: Whether this qualifies for proration
- `upgradeMessage`: User-friendly message

### 2. Enhanced Renewal Dialog

**File:** `/src/components/dashboard/members/renew-plan-dialogue.tsx`

**New Props Added:**
- `currentPlanId?: string`
- `currentPlanPrice?: number`
- `currentPlanDuration?: number`

**Automatic Features:**
1. Detects if upgrade is early (plan not expired)
2. Calculates proration automatically on plan selection
3. Pre-fills payment amount with prorated value
4. Shows detailed breakdown in UI

**UI Components:**
- Alert box showing discount details
- Itemized breakdown:
  - New plan price
  - Unused value discount (in green)
  - Final payable amount (highlighted)
  - Savings percentage

### 3. Attendance Page Integration

**File:** `/src/app/dashboard/attendance/page.tsx`

**Implementation:**
1. Stores current plan details when member is selected
2. Fetches plan information from `membershipPlans` collection
3. Passes all required data to `RenewPlanDialog`

**State Management:**
```typescript
const [selectedMember, setSelectedMember] = useState<{
  id: string;
  name: string;
  currentEndDate: string;
  currentPlanId?: string;
} | null>(null);

const [currentPlanDetails, setCurrentPlanDetails] = useState<{
  price: number;
  duration: number;
} | null>(null);
```

## Database Structure

### Required Data in `AttendanceRecord`:
- `membershipPlanId`: Current plan ID
- `membershipEnd`: Current plan end date
- `userId`: Member ID

### Required Data in `MembershipPlan`:
- `id`: Plan ID
- `price`: Plan price
- `durationInDays`: Plan duration

### Payment Record Created:
```typescript
{
  userId: string,
  planId: string,
  amount: number, // Final prorated amount
  paymentDate: timestamp,
  mode: "UPI" | "CARD" | "CASH",
  status: "success",
  month: "YYYY-MM",
  transactionId: string,
  handledBy: string
}
```

### Membership History Entry:
```typescript
{
  membershipPlanId: string,
  membershipPlan: string,
  membershipStart: ISO date,
  membershipEnd: ISO date,
  price: number, // Original plan price
  paidAmount: number, // Actual prorated amount paid
  paymentMode: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## User Flow

1. **Admin clicks "Renew" on attendance page**
2. **System detects:**
   - Current plan details
   - Days remaining
   - Whether upgrade is early

3. **Admin selects new plan**
4. **System shows:**
   - New plan price
   - Unused value discount (if applicable)
   - Final payable amount
   - Savings percentage

5. **Admin confirms payment**
6. **System creates:**
   - Payment record with prorated amount
   - Membership history entry
   - Updates revenue stats

## Edge Cases Handled

### 1. Plan Expired
- **Behavior:** No proration applied
- **Message:** "Your current plan has expired. Full payment required."
- **Amount:** Full new plan price

### 2. Same Plan Renewal
- **Behavior:** No proration (regular renewal)
- **Amount:** Full plan price

### 3. Downgrade
- **Behavior:** Proration still applies
- **Note:** Member gets credit for unused days

### 4. Discount Exceeds New Plan Price
- **Behavior:** Discount capped at new plan price
- **Amount:** Minimum ₹0

### 5. Missing Current Plan Data
- **Behavior:** Fallback to regular renewal
- **Amount:** Full new plan price

## UI/UX Features

### Visual Indicators
- 🎉 Emoji for upgrade discount
- 📊 Color-coded breakdown
- ✅ Savings percentage highlight
- 💰 Large final amount display

### Responsiveness
- Mobile-optimized alert layout
- Compact on small screens
- Full details on desktop

### Accessibility
- Clear labels
- High contrast colors
- Readable font sizes
- Semantic HTML

## Testing Scenarios

### Test Case 1: Early Upgrade
- Current: ₹1,000/30 days, 15 days left
- New: ₹1,500/30 days
- Expected: ₹1,000 payable (₹500 discount)

### Test Case 2: Expired Plan
- Current: Expired 5 days ago
- New: ₹1,500/30 days
- Expected: ₹1,500 payable (no discount)

### Test Case 3: Last Day Upgrade
- Current: ₹1,200/30 days, 1 day left
- New: ₹1,500/30 days
- Expected: ₹1,460 payable (₹40 discount)

### Test Case 4: Big Discount
- Current: ₹2,000/30 days, 20 days left
- New: ₹1,000/30 days
- Expected: ₹0 payable (credit ₹333 unused)

## Future Enhancements

### Possible Additions:
1. **Credit System**: Store unused value for future use
2. **Partial Refunds**: Option to refund instead of credit
3. **Plan Comparison**: Side-by-side comparison tool
4. **Upgrade History**: Track all plan changes
5. **Email Notifications**: Send upgrade confirmations
6. **Analytics**: Track upgrade patterns
7. **Flexible Start Dates**: Allow future upgrade scheduling

## API Endpoints (If Needed)

If you decide to move calculations to backend:

```typescript
// POST /api/calculate-proration
{
  currentPlanId: string,
  newPlanId: string,
  memberId: string
}

// Response
{
  unusedValue: number,
  proratedDiscount: number,
  finalPayableAmount: number,
  savingsPercentage: number,
  breakdown: {
    currentPlanPrice: number,
    daysRemaining: number,
    newPlanPrice: number
  }
}
```

## Configuration Options

Add to settings if needed:

```typescript
{
  enableProration: boolean,
  minDaysForProration: number, // e.g., only apply if >3 days left
  maxDiscountPercentage: number, // cap discount at X%
  allowDowngradeProration: boolean
}
```

## Security Considerations

1. **Validation:** Verify member owns the current plan
2. **Authorization:** Only admins can process upgrades
3. **Audit Trail:** Log all plan changes
4. **Price Verification:** Double-check plan prices from database
5. **Transaction Safety:** Use Firestore transactions for atomicity

## Performance Optimization

1. **Client-Side Calculations:** Fast, no API calls needed
2. **Cached Plan Data:** Plans already loaded for display
3. **Lazy Loading:** Dialog only renders when opened
4. **Minimal Re-renders:** Memoized calculations

## Conclusion

The early plan upgrade feature with prorated pricing is now fully implemented and integrated into the attendance page renewal flow. It provides:

- ✅ Fair pricing for early upgrades
- ✅ Clear breakdown of costs
- ✅ Automatic calculations
- ✅ Seamless user experience
- ✅ Proper data tracking

All calculations happen client-side for speed, with full transaction safety through Firestore's atomic operations.
