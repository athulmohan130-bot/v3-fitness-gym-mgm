# External Server Integration Guide

## Overview

This web application syncs member registration data to **Firebase Realtime Database**. Your external server (running on a separate machine) should listen to this database and handle ESSL biometric enrollment.

## Architecture

```
┌─────────────────────┐
│  Next.js Web App    │  ← Deployed on Vercel
│  (This Project)     │
└──────────┬──────────┘
           │
           ↓ Writes member data
┌─────────────────────────────────────────────────────┐
│  Firebase Realtime Database                         │
│  https://studio-7778498060-d5b43-default-rtdb...    │
│                                                     │
│  member_registrations/                              │
│    └─ {auto-id}/                                    │
│         ├─ userId: "abc123"                         │
│         ├─ name: "John Doe"                         │
│         ├─ email: "john@example.com"                │
│         ├─ phone: "+1234567890"                     │
│         ├─ biometricDeviceId: "BIO001"              │
│         ├─ membershipPlanId: "plan-xyz"             │
│         ├─ membershipStart: "2025-01-15..."         │
│         ├─ membershipEnd: "2025-02-15..."           │
│         ├─ joinDate: "2025-01-15..."                │
│         ├─ timestamp: "2025-01-15..."               │
│         └─ event: "member_registered"               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ↓ Listens for changes
           ┌──────────────────────┐
           │  External Server     │  ← Your separate machine
           │  (Not in this repo)  │
           └──────────┬───────────┘
                      │
                      ↓ Enrolls user
           ┌──────────────────────┐
           │  ESSL Device         │  ← Biometric hardware
           └──────────────────────┘
```

## What This Project Does

When an admin registers a new member through the web interface:

1. ✅ Saves member data to **Firestore** (primary database)
2. ✅ Syncs member data to **Firebase Realtime Database** at `member_registrations/{id}`
3. ✅ Returns success to user

**That's it!** This project does NOT handle ESSL enrollment. That's your external server's job.

## Firebase Realtime Database URL

```
https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/
```

## Data Structure

When a member is registered, this data is written to Realtime Database:

```json
{
  "member_registrations": {
    "-NqPxyz123abc": {
      "userId": "abc123xyz",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "biometricDeviceId": "BIO001",
      "membershipPlanId": "plan-xyz-123",
      "membershipStart": "2025-01-15T00:00:00.000Z",
      "membershipEnd": "2025-02-15T00:00:00.000Z",
      "joinDate": "2025-01-15T00:00:00.000Z",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "event": "member_registered"
    }
  }
}
```

## Setting Up Your External Server

### Prerequisites

1. **Firebase Admin SDK** - To connect to Firebase from your server
2. **Node.js** (or Python, Java, etc.) - Your server runtime
3. **ESSL SDK/Library** - To communicate with biometric device
4. **Network access** - Your server needs internet to reach Firebase

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project
3. Settings ⚙️ → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file (keep it secure!)

### Step 2: Install Firebase Admin SDK

**For Node.js:**
```bash
npm install firebase-admin
```

**For Python:**
```bash
pip install firebase-admin
```

**For Java:**
```xml
<dependency>
  <groupId>com.google.firebase</groupId>
  <artifactId>firebase-admin</artifactId>
  <version>9.2.0</version>
</dependency>
```

### Step 3: Listen to Realtime Database

#### Node.js Example:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const registrationsRef = db.ref('member_registrations');

// Listen for new member registrations
registrationsRef.on('child_added', async (snapshot) => {
  const memberData = snapshot.val();
  const registrationId = snapshot.key;

  console.log('New member registered:', memberData);

  // ⚡ YOUR ESSL ENROLLMENT LOGIC HERE ⚡
  try {
    await enrollInESSL(memberData);

    // Update status back to Firebase
    await snapshot.ref.update({
      esslEnrolled: true,
      esslEnrolledAt: new Date().toISOString(),
      esslStatus: 'success'
    });

    console.log('✅ Successfully enrolled:', memberData.name);
  } catch (error) {
    console.error('❌ Enrollment failed:', error);

    // Update with error status
    await snapshot.ref.update({
      esslEnrolled: false,
      esslStatus: 'failed',
      esslError: error.message
    });
  }
});

console.log('🎧 Listening for member registrations...');

// Your ESSL enrollment function
async function enrollInESSL(memberData) {
  // Implement your ESSL device communication here
  // Example using ZKTeco SDK:
  //
  // const ZKLib = require('node-zklib');
  // const device = new ZKLib('192.168.1.100', 4370, 10000, 4000);
  // await device.createSocket();
  // await device.setUser(
  //   memberData.biometricDeviceId,
  //   memberData.name,
  //   memberData.userId
  // );
  // await device.disconnect();
}
```

#### Python Example:

```python
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/'
})

# Reference to member registrations
ref = db.reference('member_registrations')

# Listen for new registrations
def on_child_added(event):
    member_data = event.data
    registration_id = event.path

    print(f"New member: {member_data['name']}")

    try:
        # Your ESSL enrollment logic here
        enroll_in_essl(member_data)

        # Update status
        db.reference(f'member_registrations/{registration_id}').update({
            'esslEnrolled': True,
            'esslStatus': 'success'
        })

        print(f"✅ Enrolled: {member_data['name']}")
    except Exception as e:
        print(f"❌ Failed: {e}")
        db.reference(f'member_registrations/{registration_id}').update({
            'esslEnrolled': False,
            'esslStatus': 'failed',
            'esslError': str(e)
        })

# Start listening
ref.listen(on_child_added)

print('🎧 Listening for member registrations...')

def enroll_in_essl(member_data):
    # Your ESSL device communication here
    pass
```

### Step 4: Implement ESSL Enrollment

This depends on your ESSL device model:

**ZKTeco devices:** Use `node-zklib` (Node.js) or `pyzk` (Python)
**Anviz devices:** Use manufacturer's SDK
**Other brands:** Check device documentation

Example for ZKTeco:
```bash
npm install node-zklib
```

```javascript
const ZKLib = require('node-zklib');

async function enrollInESSL(memberData) {
  const device = new ZKLib(
    '192.168.1.100',  // ESSL device IP
    4370,              // Port
    10000,             // Timeout
    4000               // Inport
  );

  try {
    await device.createSocket();

    // Add user to device
    await device.setUser(
      parseInt(memberData.biometricDeviceId),
      memberData.name,
      0,  // password (optional)
      parseInt(memberData.userId),
      1,  // role (1 = user)
      0   // timezone
    );

    await device.disconnect();
    return true;
  } catch (error) {
    throw new Error(`ESSL enrollment failed: ${error.message}`);
  }
}
```

## Testing the Integration

### 1. Start Your External Server

```bash
node your-server.js
# or
python your-server.py
```

You should see:
```
🎧 Listening for member registrations...
```

### 2. Register a Member

Go to the web app and register a test member:
- Development: `http://localhost:9002/dashboard/members/new`
- Production: `https://your-app.vercel.app/dashboard/members/new`

### 3. Check Your Server Logs

Within seconds, you should see:
```
New member registered: { userId: 'abc123', name: 'John Doe', ... }
✅ Successfully enrolled: John Doe
```

### 4. Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Realtime Database
3. Look for `member_registrations` node
4. Check for `esslEnrolled: true` and `esslStatus: 'success'`

## Firebase Realtime Database Security Rules

Make sure your database has proper security rules:

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

This allows authenticated users (your admin SDK) to read and write.

## Optional: Sync Attendance Back to Firebase

You can also push attendance logs from ESSL back to Firebase:

```javascript
// Poll ESSL device for attendance logs
setInterval(async () => {
  const logs = await getAttendanceLogsFromESSL();

  for (const log of logs) {
    const date = new Date(log.timestamp).toISOString().split('T')[0];

    await db.ref(`attendance_logs/${date}/records`).push({
      userId: log.userId,
      checkInTime: log.timestamp,
      source: 'essl',
      biometricDeviceId: log.deviceId,
      status: 'present'
    });
  }
}, 30000); // Every 30 seconds
```

This will make attendance data appear in the web app's attendance page!

## Environment Variables Needed

Your external server needs:

```bash
# Path to Firebase service account key
FIREBASE_SERVICE_ACCOUNT=/path/to/serviceAccountKey.json

# Firebase Realtime Database URL
FIREBASE_DATABASE_URL=https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/

# ESSL Device Configuration
ESSL_DEVICE_IP=192.168.1.100
ESSL_DEVICE_PORT=4370
ESSL_DEVICE_PASSWORD=0
```

## Troubleshooting

### "Permission denied" error
- Check Firebase service account key is valid
- Verify Realtime Database rules allow authenticated access

### No data appearing in listener
- Check Firebase Realtime Database URL is correct
- Verify data is being written (check Firebase Console)
- Make sure listener is running before registering member

### ESSL device not responding
- Check device IP and port
- Verify device is on same network
- Test connection: `ping 192.168.1.100`
- Check firewall isn't blocking connection

## Summary

✅ **This project does:**
- Register members through web UI
- Save to Firestore (primary database)
- Sync to Firebase Realtime Database

❌ **This project does NOT do:**
- ESSL device enrollment (that's your external server)
- Direct hardware communication
- Local network operations

🎯 **Your external server should:**
- Listen to Firebase Realtime Database
- Detect new member registrations
- Enroll members in ESSL device
- Update enrollment status back to Firebase

---

## Need Help?

- Firebase Admin SDK Docs: https://firebase.google.com/docs/admin/setup
- Realtime Database Docs: https://firebase.google.com/docs/database
- Check Firebase Console for data and errors
