#!/usr/bin/env node

/**
 * Test Member Registration Script
 *
 * This script simulates a member registration by writing directly
 * to Firebase Realtime Database at member_registrations/{id}
 *
 * Usage:
 *   node test-member-registration.js
 *
 * Prerequisites:
 *   npm install firebase-admin
 *   Place your firebase-service-account-key.json in the project root
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure you have your service account key file
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/'
});

const db = admin.database();

// Test member data
const testMemberData = {
  userId: `test_${Date.now()}`,
  name: "John Doe (Test User)",
  email: "john.doe.test@example.com",
  phone: "+919876543210",
  biometricDeviceId: "BIO001",
  membershipPlanId: "test-plan-123",
  membershipStart: new Date().toISOString(),
  membershipEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  joinDate: new Date().toISOString(),
  timestamp: new Date().toISOString(),
  event: 'member_registered',
};

// Write to Firebase Realtime Database
async function testMemberRegistration() {
  try {
    console.log('🧪 Testing member registration...\n');
    console.log('📝 Member Data:');
    console.log(JSON.stringify(testMemberData, null, 2));
    console.log('\n⏳ Writing to Firebase Realtime Database...\n');

    const registrationsRef = db.ref('member_registrations');
    const newRegistrationRef = registrationsRef.push();

    await newRegistrationRef.set(testMemberData);

    console.log('✅ SUCCESS! Member registration written to Firebase');
    console.log(`📍 Path: member_registrations/${newRegistrationRef.key}`);
    console.log('\n🎧 Your external server should have received this registration!');
    console.log('\n📊 You can view this data in Firebase Console:');
    console.log('   https://console.firebase.google.com/project/studio-7778498060-d5b43/database/studio-7778498060-d5b43-default-rtdb/data');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure firebase-service-account-key.json exists in project root');
    console.error('2. Run: npm install firebase-admin');
    console.error('3. Check Firebase Database Rules allow write access');
    process.exit(1);
  }
}

testMemberRegistration();
