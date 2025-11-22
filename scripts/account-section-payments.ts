/**
 * Account Section Payment Records Script
 *
 * This script adds payment records based on account section data only.
 * Excludes members that are missing from account section.
 * Uses corrected amounts for mismatched members.
 *
 * Usage:
 *   npx ts-node scripts/account-section-payments.ts [--dry-run]
 *
 * Flags:
 *   --dry-run    Safe mode - only shows what would be written, no actual writes
 *   --execute    Actually execute the writes (default is dry-run for safety)
 */

import admin from 'firebase-admin';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Configuration
const DRY_RUN = !process.argv.includes('--execute');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

// Initialize Firebase Admin
function initializeFirebase() {
  try {
    const possiblePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(__dirname, 'serviceAccountKey.json'),
      path.join(__dirname, '..', 'src', 'serviceAccountKey.json'),
      path.join(__dirname, '..', 'serviceAccountKey.json'),
      './serviceAccountKey.json',
      './src/serviceAccountKey.json',
    ].filter(Boolean);

    let serviceAccountPath: string | undefined;
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        serviceAccountPath = p;
        logInfo(`Found service account at: ${p}`);
        break;
      }
    }

    if (!serviceAccountPath) {
      throw new Error('Service account file not found in any expected location');
    }

    if (admin.apps && admin.apps.length > 0) {
      return admin.firestore();
    }

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logSuccess('Firebase Admin initialized successfully');
    return admin.firestore();
  } catch (error) {
    logError('Failed to initialize Firebase Admin');
    logError('Make sure you have serviceAccountKey.json in the correct location');
    console.error(error);
    process.exit(1);
  }
}

interface AccountEntry {
  name: string;
  amount: number;
  searchNames: string[];  // Alternative names to search for
}

interface PaymentRecord {
  userId: string;
  planId: string;
  amount: number;
  paymentDate: admin.firestore.Timestamp | Date;
  mode: string;
  status: 'success' | 'failed' | 'pending';
  month: string;
  transactionId: string;
  handledBy: string;
  type: 'registration' | 'renewal';
  memberName?: string;
}

// Account section data with corrections
const ACCOUNT_DATA: AccountEntry[] = [
  { name: 'Vijay', amount: 1000, searchNames: ['vijay', 'vij'] },
  { name: 'Sabu S Pillai', amount: 1500, searchNames: ['sabu', 'pillai'] },
  { name: 'Satheesh Kumar C', amount: 1500, searchNames: ['satheesh', 'kumar c'] },
  { name: 'Manoj', amount: 500, searchNames: ['manoj'] },
  { name: 'Ramesh Kumar B', amount: 1000, searchNames: ['ramesh', 'kumar b'] },
  { name: 'Vidhu', amount: 1000, searchNames: ['vidhu'] },
  { name: 'Jayakrishnan', amount: 1500, searchNames: ['jayakrishnan', 'jayakrishnan r'] },
  { name: 'Akhil Krishna', amount: 600, searchNames: ['akhil', 'krishna'] },
  { name: 'Abhean', amount: 10500, searchNames: ['abhean', 'koshy', 'varghese'] },
  { name: 'Sumesh', amount: 374, searchNames: ['sumesh', 'surendran'] },  // Corrected amount
  { name: 'Anoop', amount: 374, searchNames: ['anoop', 'anoop s'] },  // Corrected amount
  { name: 'Sajith', amount: 350, searchNames: ['sajith', 'sajith s'] },
  { name: 'Ranjith', amount: 350, searchNames: ['ranjith', 'kumar'] },
  { name: 'Seetha', amount: 360, searchNames: ['seetha', 'km'] },
  { name: 'Karthika', amount: 360, searchNames: ['karthika', 'karthika s'] },
  { name: 'Aswin', amount: 420, searchNames: ['aswin', 'p kumar'] },
  { name: 'Madhu', amount: 500, searchNames: ['madhu', 'narayanan'] },  // Corrected amount
  { name: 'Vinod J', amount: 330, searchNames: ['vinod', 'vinod j'] },
  { name: 'Mahadev', amount: 330, searchNames: ['mahadev', 'mahadev m'] },
];

// Members to exclude (not in account section)
const EXCLUDED_MEMBERS = [
  'sreejith jaba',
  'sreeraj s',
  'kukku narayanan',
  'kishore sivadasan',
  'sanjay prathap',
  'jitheshkumar s',
];

function generateTransactionId(): string {
  return `TXN-ACCOUNT-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isExcludedMember(name: string): boolean {
  const normalized = normalizeString(name);
  return EXCLUDED_MEMBERS.some(excluded => {
    return normalized.includes(excluded) || excluded.includes(normalized);
  });
}

function findMatchingUser(userName: string, accountEntry: AccountEntry): boolean {
  const normalizedUserName = normalizeString(userName);

  // Check if user matches any of the search names
  return accountEntry.searchNames.some(searchName => {
    const normalizedSearchName = normalizeString(searchName);
    return normalizedUserName.includes(normalizedSearchName) ||
           normalizedSearchName.includes(normalizedUserName);
  });
}

async function findUserByName(db: admin.firestore.Firestore, accountEntry: AccountEntry): Promise<any | null> {
  try {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userName = userData.name || '';

      // Skip excluded members
      if (isExcludedMember(userName)) {
        continue;
      }

      // Check if this user matches the account entry
      if (findMatchingUser(userName, accountEntry)) {
        return {
          id: userDoc.id,
          ...userData,
        };
      }
    }

    return null;
  } catch (error) {
    logError(`Error finding user for ${accountEntry.name}: ${error}`);
    return null;
  }
}

interface UserMembershipData {
  planId: string;
  registrationDate: Date;
}

async function getUserMembershipData(db: admin.firestore.Firestore, userId: string): Promise<UserMembershipData> {
  try {
    // First check user's current membership plan and join date
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let planId = 'KkVQzpzfhfxekx7Hv4jn'; // default
    let registrationDate = new Date();

    // Try to get registration date from user data
    if (userData?.createdAt) {
      registrationDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    } else if (userData?.joinDate) {
      registrationDate = new Date(userData.joinDate);
    }

    // Get plan ID from user's current membership or history
    if (userData?.membershipPlanId) {
      planId = userData.membershipPlanId;
    } else {
      // Fallback: check membership history for first entry (registration)
      const historySnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('membershipHistory')
        .orderBy('createdAt', 'asc')  // Get FIRST entry (registration)
        .limit(1)
        .get();

      if (!historySnapshot.empty) {
        const firstHistory = historySnapshot.docs[0].data();
        if (firstHistory.membershipPlanId) {
          planId = firstHistory.membershipPlanId;
        }
        // Also update registration date from membership history if available
        if (firstHistory.createdAt) {
          registrationDate = firstHistory.createdAt.toDate ? firstHistory.createdAt.toDate() : new Date(firstHistory.createdAt);
        }
      }
    }

    return { planId, registrationDate };
  } catch (error) {
    logWarning(`Could not find data for user ${userId}, using defaults`);
    return {
      planId: 'KkVQzpzfhfxekx7Hv4jn',
      registrationDate: new Date(),
    };
  }
}

async function preparePayments(db: admin.firestore.Firestore): Promise<PaymentRecord[]> {
  const paymentsToCreate: PaymentRecord[] = [];
  const notFoundMembers: string[] = [];

  logHeader('Processing Account Section Data');

  for (const accountEntry of ACCOUNT_DATA) {
    logInfo(`Searching for: ${accountEntry.name} (₹${accountEntry.amount})`);

    const user = await findUserByName(db, accountEntry);

    if (!user) {
      notFoundMembers.push(accountEntry.name);
      logWarning(`  ✗ User not found: ${accountEntry.name}`);
      continue;
    }

    logSuccess(`  ✓ Found user: ${user.name} (ID: ${user.id})`);

    // Get user's membership plan and registration date
    const { planId, registrationDate } = await getUserMembershipData(db, user.id);

    // Calculate month from registration date
    const month = format(registrationDate, 'yyyy-MM');

    logInfo(`    Registration Date: ${format(registrationDate, 'yyyy-MM-dd')}, Plan: ${planId}`);

    // Create payment record
    const paymentRecord: PaymentRecord = {
      userId: user.id,
      planId: planId,
      amount: accountEntry.amount,
      paymentDate: admin.firestore.Timestamp.fromDate(registrationDate),
      mode: 'CASH',
      status: 'success',
      month: month,
      transactionId: generateTransactionId(),
      handledBy: 'Account Section',
      type: 'registration',
      memberName: user.name,
    };

    paymentsToCreate.push(paymentRecord);
  }

  if (notFoundMembers.length > 0) {
    logHeader('Members Not Found');
    notFoundMembers.forEach(name => logWarning(`- ${name}`));
  }

  return paymentsToCreate;
}

function displayPaymentPreview(payments: PaymentRecord[]) {
  logHeader('Payment Records to Create');

  if (payments.length === 0) {
    logWarning('No payment records to create');
    return;
  }

  console.log('\n' + '-'.repeat(120));
  console.log(
    'Member Name'.padEnd(25) +
    'Type'.padEnd(15) +
    'Amount'.padEnd(12) +
    'Mode'.padEnd(15) +
    'Month'.padEnd(12) +
    'Plan ID'.padEnd(25)
  );
  console.log('-'.repeat(120));

  let totalAmount = 0;

  for (const payment of payments) {
    totalAmount += payment.amount;
    console.log(
      (payment.memberName || 'Unknown').substring(0, 24).padEnd(25) +
      payment.type.padEnd(15) +
      `₹${payment.amount}`.padEnd(12) +
      payment.mode.padEnd(15) +
      payment.month.padEnd(12) +
      (payment.planId || 'N/A').substring(0, 24).padEnd(25)
    );
  }

  console.log('-'.repeat(120));
  console.log('\n');
  logInfo(`Total Records: ${payments.length}`);
  logInfo(`Total Amount: ₹${totalAmount.toLocaleString()}`);
}

async function executeWrites(
  db: admin.firestore.Firestore,
  payments: PaymentRecord[]
): Promise<{ success: number; failed: number }> {
  logHeader('Executing Writes');

  let success = 0;
  let failed = 0;

  const batch = db.batch();
  const BATCH_SIZE = 500;

  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    const paymentRef = db.collection('payments').doc();

    const { memberName, ...paymentData } = payment;

    batch.set(paymentRef, paymentData);

    if ((i + 1) % BATCH_SIZE === 0 || i === payments.length - 1) {
      try {
        await batch.commit();
        success += Math.min(BATCH_SIZE, (i % BATCH_SIZE) + 1);
        logSuccess(`Committed batch: ${Math.min(i + 1, payments.length)}/${payments.length} records`);
      } catch (error) {
        failed += Math.min(BATCH_SIZE, (i % BATCH_SIZE) + 1);
        logError(`Failed to commit batch: ${error}`);
      }
    }
  }

  return { success, failed };
}

async function main() {
  console.clear();
  logHeader('Account Section Payment Records Script');

  if (DRY_RUN) {
    logWarning('Running in DRY-RUN mode (safe mode)');
    logWarning('No data will be written to Firestore');
    logInfo('Use --execute flag to actually write data');
  } else {
    logError('EXECUTING WRITES - This will modify your database!');
    logInfo('Press Ctrl+C within 5 seconds to abort...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const db = initializeFirebase();

  // Prepare payment records
  const payments = await preparePayments(db);

  // Display preview
  displayPaymentPreview(payments);

  // Execute writes if not in dry-run mode
  if (!DRY_RUN && payments.length > 0) {
    const { success, failed } = await executeWrites(db, payments);

    logHeader('Execution Complete');
    logSuccess(`Successfully created: ${success} payment records`);
    if (failed > 0) {
      logError(`Failed to create: ${failed} payment records`);
    }
  } else if (DRY_RUN && payments.length > 0) {
    logHeader('Dry Run Complete');
    logWarning(`Would create ${payments.length} payment records`);
    logInfo('Run with --execute flag to actually create these records');
  }

  process.exit(0);
}

// Run the script
main().catch(error => {
  logError('Script failed with error:');
  console.error(error);
  process.exit(1);
});
