/**
 * Migration Script: Populate Payments Collection from Membership History
 *
 * This script scans the users collection and their membershipHistory subcollections
 * to populate the payments collection with historical registration payments.
 *
 * Usage:
 *   npx ts-node scripts/populate-payments-collection.ts [--dry-run]
 *
 * Flags:
 *   --dry-run    Safe mode - only shows what would be written, no actual writes
 *   --execute    Actually execute the writes (default is dry-run for safety)
 *
 * Requirements:
 *   - Firebase Admin SDK credentials (service account JSON)
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in project root
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
    // Try to use service account from environment or local file
    // Check multiple possible locations
    const possiblePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(__dirname, 'serviceAccountKey.json'),  // scripts folder
      path.join(__dirname, '..', 'serviceAccountKey.json'),  // project root
      './serviceAccountKey.json',
      './scripts/serviceAccountKey.json',
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

    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      return admin.firestore();
    }

    // Load service account JSON
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logSuccess('Firebase Admin initialized successfully');
    return admin.firestore();
  } catch (error) {
    logError('Failed to initialize Firebase Admin');
    logError('Make sure you have serviceAccountKey.json in the scripts folder or project root');
    logError('Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.error(error);
    process.exit(1);
  }
}

interface MembershipHistoryEntry {
  id: string;
  membershipStart: string;
  membershipEnd: string;
  membershipPlanId: string;
  membershipPlan: string;
  price: number;
  registrationFee?: number;
  totalAmount?: number;
  paidAmount?: number;
  paymentMode?: string;
  createdAt: admin.firestore.Timestamp | string;
  updatedAt?: admin.firestore.Timestamp | string;
  prorationDetails?: any;
}

interface UserData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  biometricDeviceId?: string;
  membershipPlanId?: string;
  createdAt?: admin.firestore.Timestamp | string;
  joinDate?: string;
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
  memberName?: string; // For logging purposes
}

interface MigrationStats {
  usersScanned: number;
  membershipHistoriesFound: number;
  paymentsToCreate: number;
  paymentsAlreadyExist: number;
  errors: number;
}

async function getExistingPaymentUserIds(db: admin.firestore.Firestore): Promise<Set<string>> {
  logInfo('Fetching existing payments to avoid duplicates...');

  const paymentsSnapshot = await db.collection('payments').get();
  const existingUserPayments = new Set<string>();

  paymentsSnapshot.forEach(doc => {
    const data = doc.data();
    // Create a unique key combining userId and approximate timestamp
    const paymentDate = data.paymentDate?.toDate?.() || new Date(data.paymentDate);
    const key = `${data.userId}_${data.type || 'unknown'}_${format(paymentDate, 'yyyy-MM')}`;
    existingUserPayments.add(key);
  });

  logInfo(`Found ${paymentsSnapshot.size} existing payment records`);
  return existingUserPayments;
}

function generateTransactionId(): string {
  return `TXN-MIGRATION-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function parseTimestamp(value: admin.firestore.Timestamp | string | undefined): Date {
  if (!value) return new Date();
  if (typeof value === 'string') return new Date(value);
  if (value.toDate) return value.toDate();
  return new Date();
}

async function scanAndPreparePayments(
  db: admin.firestore.Firestore,
  existingPayments: Set<string>
): Promise<{ payments: PaymentRecord[]; stats: MigrationStats }> {
  const stats: MigrationStats = {
    usersScanned: 0,
    membershipHistoriesFound: 0,
    paymentsToCreate: 0,
    paymentsAlreadyExist: 0,
    errors: 0,
  };

  const paymentsToCreate: PaymentRecord[] = [];

  logHeader('Scanning Users Collection');

  const usersSnapshot = await db.collection('users').get();
  logInfo(`Found ${usersSnapshot.size} users to scan`);

  for (const userDoc of usersSnapshot.docs) {
    stats.usersScanned++;
    const userData = userDoc.data() as UserData;
    userData.id = userDoc.id;

    try {
      // Fetch membership history for this user
      const historySnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('membershipHistory')
        .orderBy('createdAt', 'asc')
        .get();

      if (historySnapshot.empty) {
        continue;
      }

      let isFirstEntry = true;

      for (const historyDoc of historySnapshot.docs) {
        stats.membershipHistoriesFound++;
        const historyData = historyDoc.data() as MembershipHistoryEntry;
        historyData.id = historyDoc.id;

        // Determine paid amount
        let paidAmount = historyData.paidAmount || historyData.totalAmount || historyData.price || 0;

        // For the first entry (registration), include registration fee if present
        if (isFirstEntry && historyData.registrationFee) {
          // paidAmount should already include registration fee in totalAmount
          // but verify it
          const expectedTotal = (historyData.price || 0) + (historyData.registrationFee || 0);
          if (historyData.totalAmount && Math.abs(historyData.totalAmount - expectedTotal) < 1) {
            paidAmount = historyData.paidAmount || historyData.totalAmount;
          }
        }

        // Skip if no payment was made
        if (paidAmount <= 0) {
          logWarning(`  Skipping ${userData.name} - membership history ${historyDoc.id}: No payment recorded`);
          continue;
        }

        // Determine payment date
        const paymentDate = parseTimestamp(historyData.createdAt);
        const monthKey = format(paymentDate, 'yyyy-MM');

        // Determine payment type
        const paymentType = isFirstEntry ? 'registration' : 'renewal';

        // Check if this payment might already exist
        const uniqueKey = `${userDoc.id}_${paymentType}_${monthKey}`;
        if (existingPayments.has(uniqueKey)) {
          stats.paymentsAlreadyExist++;
          logWarning(`  Skipping ${userData.name} - ${paymentType} payment for ${monthKey} already exists`);
          isFirstEntry = false;
          continue;
        }

        // Determine payment mode
        let paymentMode = (historyData.paymentMode || 'CASH').toUpperCase();
        if (!['UPI', 'CARD', 'CASH', 'BANK TRANSFER'].includes(paymentMode)) {
          paymentMode = 'CASH';
        }

        const paymentRecord: PaymentRecord = {
          userId: userDoc.id,
          planId: historyData.membershipPlanId || userData.membershipPlanId || '',
          amount: paidAmount,
          paymentDate: admin.firestore.Timestamp.fromDate(paymentDate),
          mode: paymentMode,
          status: 'success',
          month: monthKey,
          transactionId: generateTransactionId(),
          handledBy: 'Migration Script',
          type: paymentType,
          memberName: userData.name,
        };

        paymentsToCreate.push(paymentRecord);
        stats.paymentsToCreate++;

        isFirstEntry = false;
      }
    } catch (error) {
      stats.errors++;
      logError(`Error processing user ${userData.name} (${userDoc.id}): ${error}`);
    }
  }

  return { payments: paymentsToCreate, stats };
}

function displayPaymentPreview(payments: PaymentRecord[]) {
  logHeader('Payment Records to Create');

  if (payments.length === 0) {
    logWarning('No new payment records to create');
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
  const registrationCount = payments.filter(p => p.type === 'registration').length;
  const renewalCount = payments.filter(p => p.type === 'renewal').length;

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
  logInfo(`  - Registration payments: ${registrationCount}`);
  logInfo(`  - Renewal payments: ${renewalCount}`);
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
  const BATCH_SIZE = 500; // Firestore batch limit

  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    const paymentRef = db.collection('payments').doc();

    // Remove memberName before writing (it was just for logging)
    const { memberName, ...paymentData } = payment;

    batch.set(paymentRef, paymentData);

    // Commit batch every BATCH_SIZE operations
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
  logHeader('Payments Collection Migration Script');

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

  // Get existing payments to avoid duplicates
  const existingPayments = await getExistingPaymentUserIds(db);

  // Scan users and prepare payment records
  const { payments, stats } = await scanAndPreparePayments(db, existingPayments);

  // Display summary
  logHeader('Scan Summary');
  logInfo(`Users scanned: ${stats.usersScanned}`);
  logInfo(`Membership histories found: ${stats.membershipHistoriesFound}`);
  logInfo(`Payments already exist (skipped): ${stats.paymentsAlreadyExist}`);
  logInfo(`New payments to create: ${stats.paymentsToCreate}`);
  if (stats.errors > 0) {
    logError(`Errors encountered: ${stats.errors}`);
  }

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
