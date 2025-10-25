# Firebase Realtime Database Troubleshooting

## Issue: Data Not Writing to Realtime Database

### Quick Diagnostic Steps

#### 1. Test Connection (Open in Browser)
```bash
open test-realtime-db-connection.html
```

This will:
- ✅ Test connection to Realtime Database
- ✅ Listen for new registrations
- ✅ Allow you to write test data
- ✅ Show detailed error messages

#### 2. Check Browser Console
When registering a member:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages:
   - `[Realtime DB] Member registration synced successfully` ✅ Good
   - `[Realtime DB] Failed to sync:` ❌ Error

#### 3. Check Firebase Console
1. Go to https://console.firebase.google.com/
2. Select project: `studio-7778498060-d5b43`
3. Go to **Realtime Database**
4. Check if you see data at: `member_registrations/{id}`

---

## Common Issues & Fixes

### Issue 1: Permission Denied

**Error in console:**
```
PERMISSION_DENIED: Permission denied
```

**Cause:** Firebase Realtime Database security rules are blocking writes

**Fix:** Update database rules

1. Go to Firebase Console → Realtime Database → Rules
2. For **TESTING ONLY**, use these rules:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. For **PRODUCTION**, use authenticated rules:
```json
{
  "rules": {
    "member_registrations": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Issue 2: Database URL Not Set

**Error in console:**
```
Cannot find module 'firebase/database'
or
Database URL is not configured
```

**Fix:**

1. Check `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/
```

2. **Restart dev server** (important!):
```bash
# Kill existing server
lsof -ti:3000 | xargs kill -9

# Start fresh
npm run dev
```

### Issue 3: realtimeDb is null/undefined

**Error in console:**
```
Cannot read property 'ref' of undefined
or
realtimeDb is null
```

**Fix:**

Check that `realtimeDb` is passed through the provider chain:

1. [firebase/index.ts](src/firebase/index.ts) exports `realtimeDb`
2. [firebase/client-provider.tsx](src/firebase/client-provider.tsx) passes it to provider
3. [firebase/provider.tsx](src/firebase/provider.tsx) includes it in context

Verify with console log:
```typescript
// In new-member-form.tsx
const realtimeDb = useRealtimeDb();
console.log('Realtime DB instance:', realtimeDb);
```

Should show: `DatabaseImpl { ... }` not `null` or `undefined`

### Issue 4: Transaction Conflict

**Error in console:**
```
Transaction aborted
or
Contention on these documents
```

**Cause:** Two transactions trying to write simultaneously

**Fix:** This is rare but can happen. The transaction will auto-retry. If persistent:
- Check if multiple browser tabs are open
- Check if multiple users are registering at same time
- Transaction code already handles retries automatically

### Issue 5: Network Error

**Error in console:**
```
Network request failed
or
ERR_CONNECTION_REFUSED
```

**Fix:**
1. Check internet connection
2. Check if Firebase is down: https://status.firebase.google.com/
3. Try accessing database URL directly:
   ```
   https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/.json
   ```
   Should return `null` or data, not 404

---

## Step-by-Step Debugging

### 1. Enable Verbose Logging

Add this to `new-member-form.tsx` temporarily:

```typescript
// Before the try block in onSuccess
console.log('=== REALTIME DB SYNC DEBUG ===');
console.log('data:', data);
console.log('realtimeDb:', realtimeDb);
console.log('biometricDeviceId:', data?.biometricDeviceId);

if (data && realtimeDb) {
  try {
    console.log('Starting Realtime DB sync...');
    const registrationsRef = rtdbRef(realtimeDb, 'member_registrations');
    console.log('Got registrationsRef:', registrationsRef);

    const newRegistrationRef = push(registrationsRef);
    console.log('Got newRegistrationRef:', newRegistrationRef.key);

    const payload = {
      userId: data.userId,
      name: variables.name,
      email: variables.email || '',
      phone: variables.phone,
      biometricDeviceId: data.biometricDeviceId,
      membershipPlanId: variables.membershipPlanId,
      membershipStart: data.membershipStart.toISOString(),
      membershipEnd: data.membershipEnd.toISOString(),
      joinDate: variables.joinDate.toISOString(),
      timestamp: new Date().toISOString(),
      event: 'member_registered',
    };
    console.log('Payload to write:', payload);

    await set(newRegistrationRef, payload);
    console.log('✅ Write successful!');
  } catch (error) {
    console.error('❌ Write failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}
```

### 2. Check Environment Variables at Runtime

Add to any component:
```typescript
useEffect(() => {
  console.log('Firebase Config:', {
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}, []);
```

### 3. Test Direct Write (Bypass Form)

Create a test button:
```typescript
<Button onClick={async () => {
  const db = useRealtimeDb();
  const testRef = rtdbRef(db, 'test/data');
  await set(testRef, {
    message: 'Hello from test',
    timestamp: new Date().toISOString()
  });
  console.log('Test write complete!');
}}>
  Test Direct Write
</Button>
```

---

## Verification Checklist

- [ ] `.env.local` has `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- [ ] Dev server restarted after adding env variable
- [ ] `realtimeDb` is not null in console
- [ ] Firebase Console shows Realtime Database is created
- [ ] Database rules allow writes (at least for testing)
- [ ] Browser console shows no errors
- [ ] Test HTML file can write data
- [ ] Can see data in Firebase Console → Realtime Database

---

## Expected Flow

When a member is registered:

1. ✅ User fills form and submits
2. ✅ Transaction creates user in Firestore
3. ✅ Transaction generates sequential biometric ID
4. ✅ Returns data with `biometricDeviceId`
5. ✅ `onSuccess` handler fires
6. ✅ Writes to Realtime Database at `member_registrations/{auto-id}`
7. ✅ Console logs: `[Realtime DB] Member registration synced successfully`
8. ✅ External server receives the data

---

## Quick Test Command

```bash
# In browser console after opening test-realtime-db-connection.html
writeTestData()
```

This writes test data directly. If this works, your Realtime DB is configured correctly.

---

## Still Not Working?

### Nuclear Option: Reset Everything

```bash
# 1. Clear .next cache
rm -rf .next

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Verify .env.local
cat .env.local | grep DATABASE_URL

# 4. Start fresh
npm run dev
```

### Get Help

If still stuck, check:
1. Firebase project is correct: `studio-7778498060-d5b43`
2. Realtime Database is enabled (not just Firestore)
3. Database URL is correct (ends with `.firebaseio.com`)
4. Billing is enabled (Realtime DB requires Blaze plan for external access)

---

## Contact Support

If you see this error:
```
Realtime Database is not enabled for this project
```

Enable it:
1. Firebase Console → Build → Realtime Database
2. Click "Create Database"
3. Choose region (should be same as Firestore)
4. Start in test mode (can change later)

---

**Last Updated**: 2025-10-25
