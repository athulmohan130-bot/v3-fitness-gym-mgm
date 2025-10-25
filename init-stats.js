#!/usr/bin/env node

/**
 * Initialize Firestore Stats Documents
 *
 * This script creates the required stats documents for member registration.
 * Safe to run multiple times - will only create if missing.
 *
 * Usage:
 *   node init-stats.js
 *
 * Or use the HTML version:
 *   open initialize-firestore-stats.html
 */

console.log('\n🔧 Firestore Stats Initialization\n');
console.log('This will create the following documents if they don\'t exist:');
console.log('  - stats/userSummary');
console.log('  - stats/revenueSummary');
console.log('  - system/biometricCounter\n');

// Check if firebase-admin is installed
try {
  require.resolve('firebase-admin');
} catch (e) {
  console.log('❌ firebase-admin is not installed.');
  console.log('\n📦 Install it with:');
  console.log('   npm install firebase-admin\n');
  console.log('Or use the HTML version instead:');
  console.log('   open initialize-firestore-stats.html\n');
  process.exit(1);
}

// Check if service account key exists
const fs = require('fs');
const path = require('path');

const serviceAccountPaths = [
  './firebase-service-account-key.json',
  './serviceAccountKey.json',
  './service-account.json',
];

let serviceAccountPath = null;

for (const p of serviceAccountPaths) {
  if (fs.existsSync(path.join(__dirname, p))) {
    serviceAccountPath = p;
    break;
  }
}

if (!serviceAccountPath) {
  console.log('❌ Firebase service account key not found.');
  console.log('\n📋 To use this script:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save as: firebase-service-account-key.json (in project root)\n');
  console.log('Or use the HTML version instead (doesn\'t need service account):');
  console.log('   open initialize-firestore-stats.html\n');
  process.exit(1);
}

const admin = require('firebase-admin');
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/'
});

const db = admin.firestore();

async function initializeStats() {
  try {
    console.log('🔍 Checking current status...\n');

    // 1. Check and initialize userSummary
    const userSummaryRef = db.collection('stats').doc('userSummary');
    const userSummaryDoc = await userSummaryRef.get();

    if (!userSummaryDoc.exists) {
      await userSummaryRef.set({
        totalMembers: 0,
        activeMembers: 0,
        newMembersThisMonth: 0,
        newMembersMonth: new Date().toISOString().substring(0, 7),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Created stats/userSummary');
    } else {
      console.log('✓ stats/userSummary already exists');
      console.log('  Data:', JSON.stringify(userSummaryDoc.data(), null, 2));
    }

    // 2. Check and initialize revenueSummary
    const revenueSummaryRef = db.collection('stats').doc('revenueSummary');
    const revenueSummaryDoc = await revenueSummaryRef.get();

    if (!revenueSummaryDoc.exists) {
      await revenueSummaryRef.set({
        totalRevenueAllTime: 0,
        monthlyRevenue: {},
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Created stats/revenueSummary');
    } else {
      console.log('✓ stats/revenueSummary already exists');
      console.log('  Data:', JSON.stringify(revenueSummaryDoc.data(), null, 2));
    }

    // 3. Check and initialize biometric counter
    const counterRef = db.collection('system').doc('biometricCounter');
    const counterDoc = await counterRef.get();

    if (!counterDoc.exists) {
      await counterRef.set({
        lastId: 0,
      });
      console.log('✅ Created system/biometricCounter (next ID: 0001)');
    } else {
      const currentId = counterDoc.data().lastId || 0;
      const nextId = (currentId + 1).toString().padStart(4, '0');
      console.log(`✓ system/biometricCounter already exists`);
      console.log(`  Current ID: ${currentId}, Next ID: ${nextId}`);
    }

    console.log('\n🎉 Initialization complete!');
    console.log('✨ You can now register members.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

initializeStats();
