# Migration Scripts

## populate-payments-collection.ts

This script migrates historical membership payment data from the `users/{userId}/membershipHistory` subcollections to the `payments` collection.

### Why is this needed?

The original registration flow only stored payment data in `membershipHistory` subcollection, not in the `payments` collection. The billing page (`/dashboard/billing`) reads from the `payments` collection, so historical registration payments don't appear there.

### Prerequisites

1. **Firebase Admin SDK Service Account**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the project root

2. **Dependencies**
   ```bash
   npm install firebase-admin date-fns
   npm install -D ts-node @types/node
   ```

### Usage

#### Dry Run (Safe Mode) - Default
Shows what data would be written without making any changes:

```bash
npx ts-node scripts/populate-payments-collection.ts
```

or explicitly:

```bash
npx ts-node scripts/populate-payments-collection.ts --dry-run
```

#### Execute Writes
Actually writes the payment records to Firestore:

```bash
npx ts-node scripts/populate-payments-collection.ts --execute
```

### What the script does

1. **Scans** all documents in the `users` collection
2. **Fetches** the `membershipHistory` subcollection for each user
3. **Determines** payment amounts from:
   - `paidAmount` field (preferred)
   - `totalAmount` field (fallback)
   - `price` field (last resort)
4. **Creates** payment records with:
   - `type: "registration"` for first membership entry
   - `type: "renewal"` for subsequent entries
5. **Skips** payments that already exist (based on userId + type + month)

### Payment Record Structure

```typescript
{
  userId: string;
  planId: string;
  amount: number;
  paymentDate: Timestamp;
  mode: "CASH" | "UPI" | "CARD" | "BANK TRANSFER";
  status: "success";
  month: "YYYY-MM";
  transactionId: "TXN-MIGRATION-...";
  handledBy: "Migration Script";
  type: "registration" | "renewal";
}
```

### Output

The script provides:
- Summary of users scanned
- Count of membership histories found
- List of payment records to be created
- Total amount calculations
- Dry-run vs execution status

### Safety Features

- **Default dry-run mode**: No writes happen unless `--execute` is passed
- **5-second countdown**: When executing, gives time to abort
- **Duplicate detection**: Skips payments that already exist
- **Batch writes**: Uses Firestore batched writes for efficiency
- **Error handling**: Continues on individual user errors, reports at end
