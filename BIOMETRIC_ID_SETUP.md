# Biometric ID System

## Overview

Member biometric IDs are now automatically generated as simple sequential numbers:
```
0001, 0002, 0003, ..., 9999, 10000, ...
```

## How It Works

1. **Firestore Counter**: A document at `system/biometricCounter` tracks the last used ID
2. **Atomic Transaction**: Each member registration increments the counter atomically
3. **Auto-scaling**: Starts with 4 digits, automatically grows (0001 → 9999 → 10000)
4. **Thread-safe**: Uses Firestore transactions to prevent duplicate IDs

## Initial Setup

The counter is automatically created when the first member is registered. It will start from `0001`.

### Optional: Set a Custom Starting Number

If you want to start from a different number (e.g., if you already have existing members):

**Using Firebase Console:**
1. Go to Firestore Database
2. Navigate to `system` collection → `biometricCounter` document
3. If it doesn't exist, create it
4. Set field: `lastId` = (your starting number - 1)
   - Example: To start from `1000`, set `lastId: 999`

**Using Firebase Admin SDK:**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

await db.collection('system').doc('biometricCounter').set({
  lastId: 999  // Next member will get ID 1000
});
```

## Data Structure

**Firestore Document:** `system/biometricCounter`
```json
{
  "lastId": 42
}
```

**Next generated ID:** `0043`

## Examples

| Counter Value | Next Generated ID |
|--------------|-------------------|
| 0 (or missing) | 0001 |
| 1 | 0002 |
| 99 | 0100 |
| 999 | 1000 |
| 9999 | 10000 |

## Benefits

✅ **Easy to remember**: "Member 0001" vs "Member BIO-1737863400000-X4K9P"
✅ **Easy to communicate**: Simple to say over phone or in person
✅ **Chronological**: Lower numbers = earlier members
✅ **Conflict-free**: Firestore transactions prevent duplicates
✅ **Scalable**: No limit, grows automatically

## Firebase Realtime Database Sync

When a member is registered, their biometric ID is synced to:
```
member_registrations/{auto-id}/
  ├─ userId: "firestore-user-id"
  ├─ biometricDeviceId: "0042"
  ├─ name: "John Doe"
  └─ ... other fields
```

Your external ESSL server can use this simple numeric ID.

## Resetting the Counter

⚠️ **WARNING**: Only do this if you're starting fresh and have no existing members!

**To reset to start from 0001 again:**
```javascript
await db.collection('system').doc('biometricCounter').delete();
```

Or set it back to 0:
```javascript
await db.collection('system').doc('biometricCounter').set({
  lastId: 0
});
```

## Migration from Old Format

If you had members with the old format (`BIO-1737863400000-X4K9P`), they will keep their IDs. Only new members will get the sequential format.

To update existing members to use sequential IDs:
1. Decide on a starting number (e.g., 1000)
2. Run a migration script to update all existing members
3. Set the counter to the last assigned ID

**Example Migration Script:**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function migrateIds() {
  const usersSnapshot = await db.collection('users').get();
  let counter = 1000; // Start from 1000

  const batch = db.batch();

  usersSnapshot.forEach(doc => {
    const newId = counter.toString().padStart(4, '0');
    batch.update(doc.ref, {
      biometricDeviceId: newId
    });
    counter++;
  });

  await batch.commit();

  // Update the counter
  await db.collection('system').doc('biometricCounter').set({
    lastId: counter - 1
  });

  console.log(`Migrated ${usersSnapshot.size} members. Next ID: ${counter}`);
}

migrateIds();
```

## Troubleshooting

### Issue: Counter document doesn't exist
**Solution**: It will be created automatically on first member registration starting from `0001`.

### Issue: Duplicate IDs
**Solution**: This shouldn't happen due to Firestore transactions. If it does:
1. Check if multiple instances are writing to different databases
2. Verify Firebase project ID is correct
3. Check transaction implementation in code

### Issue: Want to skip certain numbers
**Solution**: Manually increment the counter:
```javascript
// Skip to next hundred
await db.collection('system').doc('biometricCounter').set({
  lastId: 199  // Next member gets 0200
});
```

## Code Reference

Implementation: [new-member-form.tsx](src/components/dashboard/members/new-member-form.tsx#L256-L273)

Transaction logic:
```typescript
await runTransaction(firestore, async (transaction) => {
  const counterRef = doc(firestore, "system", "biometricCounter");
  const counterDoc = await transaction.get(counterRef);

  let nextId = 1;
  if (counterDoc.exists()) {
    nextId = (counterDoc.data().lastId || 0) + 1;
  }

  biometricDeviceId = nextId.toString().padStart(4, '0');

  transaction.set(counterRef, { lastId: nextId }, { merge: true });
});
```

---

**Version**: 2.0
**Last Updated**: 2025-10-25
