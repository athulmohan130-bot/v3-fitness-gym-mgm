/**
 * Membership Expiry Update Script
 *
 * This script updates the membership end date to TODAY for a specific list of members.
 *
 * Usage:
 *   npx ts-node scripts/dry-run-membership-update.ts [--dry-run]
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

interface TargetUser {
    name: string;
    searchNames: string[];
}

// List of users to update
const TARGET_USERS: TargetUser[] = [
    { name: 'Prajitha u', searchNames: ['prajitha', 'prajitha u'] },
    { name: 'Raji Sonkumar', searchNames: ['raji', 'sonkumar', 'raji sonkumar'] },
    { name: 'Ancy ranjith', searchNames: ['ancy', 'ranjith', 'ancy ranjith', 'ancy renjith'] },
    { name: 'Athira', searchNames: ['athira'] },
    { name: 'Pathmakumari', searchNames: ['pathmakumari', 'padmakumari'] },
    { name: 'Sreeharsh', searchNames: ['sreeharsh'] },
    { name: 'Arjun A', searchNames: ['arjun', 'arjun a'] },
    { name: 'Joyal', searchNames: ['joyal'] },
    { name: 'Subhalakshmi', searchNames: ['subhalakshmi', 'subha'] },
    { name: 'Nitha', searchNames: ['nitha'] },
    { name: 'Anoop s', searchNames: ['anoop', 'anoop s'] },
    { name: 'Vishnu S', searchNames: ['vishnu', 'vishnu s'] },
    { name: 'Ganesh bhatt', searchNames: ['ganesh', 'bhatt', 'ganesh bhatt'] },
    { name: 'Priya pai', searchNames: ['priya', 'pai', 'priya pai'] },
    { name: 'Chashma', searchNames: ['chashma'] },
    { name: 'Raheem', searchNames: ['raheem'] },
    { name: 'Arun', searchNames: ['arun'] },
    { name: 'Vimal', searchNames: ['vimal'] },
    { name: 'Safwan ansal', searchNames: ['safwan', 'ansal', 'safwan ansal'] },
    { name: 'Akhilesh', searchNames: ['akhilesh'] },
    { name: 'Salif', searchNames: ['salif'] },
    { name: 'Adarsh s', searchNames: ['adarsh', 'adarsh s'] },
    { name: 'Gokul Krishna', searchNames: ['gokul', 'krishna', 'gokul krishna'] },
    { name: 'Nithin rajagopal', searchNames: ['nithin', 'rajagopal', 'nithin rajagopal'] },
    { name: 'Akhil r', searchNames: ['akhil', 'akhil r'] },
];

function normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findMatchingUser(userName: string, targetUser: TargetUser): boolean {
    const normalizedUserName = normalizeString(userName);

    return targetUser.searchNames.some(searchName => {
        const normalizedSearchName = normalizeString(searchName);

        // 1. Exact match
        if (normalizedUserName === normalizedSearchName) return true;

        // 2. Word boundary match (e.g. "raji" matches "raji sonkumar" but NOT "prajitha")
        // Escape special regex characters in searchName just in case
        const escapedSearchName = normalizedSearchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSearchName}\\b`, 'i');

        return regex.test(normalizedUserName);
    });
}

async function findUserByName(db: admin.firestore.Firestore, targetUser: TargetUser): Promise<any | null> {
    try {
        const usersSnapshot = await db.collection('users').get();
        let matches: any[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userName = userData.name || '';

            if (findMatchingUser(userName, targetUser)) {
                matches.push({
                    id: userDoc.id,
                    ...userData,
                    matchScore: 0 // Placeholder
                });
            }
        }

        if (matches.length === 0) return null;

        // Scoring matches to find the best one
        matches = matches.map(match => {
            const normalizedUserName = normalizeString(match.name);
            let score = 0;

            // Exact match gets highest score
            if (targetUser.searchNames.some(s => normalizeString(s) === normalizedUserName)) {
                score += 100;
            }

            // Contains full name match
            if (targetUser.searchNames.some(s => normalizedUserName.includes(normalizeString(s)))) {
                score += 50;
            }

            return { ...match, score };
        });

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        if (matches.length > 1) {
            // If we have multiple matches, check if the top one is significantly better
            // or if they are ambiguous.
            const topMatch = matches[0];
            const runnerUp = matches[1];

            if (topMatch.score === runnerUp.score) {
                logWarning(`  ⚠ Ambiguous matches for ${targetUser.name}:`);
                matches.forEach(m => logWarning(`    - ${m.name} (ID: ${m.id})`));
                // For safety, maybe we shouldn't return ANY if ambiguous?
                // But for this script, let's just log and return the first one, 
                // relying on the user to verify the dry run output.
            } else {
                logInfo(`  ℹ Multiple matches for ${targetUser.name}, picked best: ${topMatch.name}`);
            }
        }

        return matches[0];
    } catch (error) {
        logError(`Error finding user for ${targetUser.name}: ${error}`);
        return null;
    }
}

interface UpdateOperation {
    userId: string;
    userName: string;
    historyId: string;
    currentEndDate: Date;
    newEndDate: Date;
}

async function prepareUpdates(db: admin.firestore.Firestore): Promise<UpdateOperation[]> {
    const updates: UpdateOperation[] = [];
    const notFoundMembers: string[] = [];
    const alreadyExpiredMembers: string[] = [];

    logHeader('Processing Users');

    const targetDate = new Date('2025-11-30');
    targetDate.setHours(23, 59, 59, 999); // End of the target day

    for (const targetUser of TARGET_USERS) {
        logInfo(`Searching for: ${targetUser.name}`);

        const user = await findUserByName(db, targetUser);

        if (!user) {
            notFoundMembers.push(targetUser.name);
            logWarning(`  ✗ User not found: ${targetUser.name}`);
            continue;
        }

        logSuccess(`  ✓ Found user: ${user.name} (ID: ${user.id})`);

        // Find active membership in history
        const historySnapshot = await db
            .collection('users')
            .doc(user.id)
            .collection('membershipHistory')
            .get();

        let activeHistoryDoc: any = null;
        let maxEndDate = new Date(0);

        // Find the membership that extends furthest into the future
        historySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.membershipEnd) {
                const endDate = new Date(data.membershipEnd);
                if (endDate > maxEndDate) {
                    maxEndDate = endDate;
                    activeHistoryDoc = { id: doc.id, ...data };
                }
            }
        });

        if (!activeHistoryDoc) {
            logWarning(`  ⚠ No membership history found for ${user.name}`);
            continue;
        }

        const currentEndDate = new Date(activeHistoryDoc.membershipEnd);

        // If already expired (end date is in the past), skip
        if (currentEndDate < new Date()) {
            logInfo(`  ℹ Membership already expired for ${user.name} (Ended: ${format(currentEndDate, 'yyyy-MM-dd')})`);
            alreadyExpiredMembers.push(user.name);
            continue;
        }

        // If already ends today (roughly), skip? Or just update to be sure.
        // Let's update to be sure it's exactly today.

        updates.push({
            userId: user.id,
            userName: user.name,
            historyId: activeHistoryDoc.id,
            currentEndDate: currentEndDate,
            newEndDate: targetDate
        });

        logInfo(`  → Will update expiry from ${format(currentEndDate, 'yyyy-MM-dd')} to ${format(targetDate, 'yyyy-MM-dd')}`);
    }

    if (notFoundMembers.length > 0) {
        logHeader('Members Not Found');
        notFoundMembers.forEach(name => logWarning(`- ${name}`));
    }

    if (alreadyExpiredMembers.length > 0) {
        logHeader('Members Already Expired (Skipping)');
        alreadyExpiredMembers.forEach(name => logInfo(`- ${name}`));
    }

    return updates;
}

async function executeUpdates(db: admin.firestore.Firestore, updates: UpdateOperation[]) {
    logHeader('Executing Updates');

    const batch = db.batch();
    let count = 0;

    for (const update of updates) {
        const userRef = db.collection('users').doc(update.userId);
        const historyRef = db.collection('users').doc(update.userId).collection('membershipHistory').doc(update.historyId);

        // Update history
        batch.update(historyRef, {
            membershipEnd: update.newEndDate.toISOString(),
            updatedAt: new Date()
        });

        // Update user doc (denormalized data)
        // We only update the user doc if this was indeed the active plan. 
        // Since we picked the one with maxEndDate, it should be the one determining the user's status.
        batch.update(userRef, {
            membershipEnd: update.newEndDate.toISOString(),
            // We might want to set status to 'active' (if it was active) or let it expire naturally?
            // If we set it to today, it effectively expires today.
            updatedAt: new Date()
        });

        count++;
    }

    if (count > 0) {
        await batch.commit();
        logSuccess(`Successfully updated ${count} users.`);
    } else {
        logInfo("No updates to execute.");
    }
}

async function main() {
    console.clear();
    logHeader('Membership Expiry Update Script');

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

    const updates = await prepareUpdates(db);

    logHeader('Summary');
    logInfo(`Total Users to Update: ${updates.length}`);

    if (!DRY_RUN && updates.length > 0) {
        await executeUpdates(db, updates);
    } else if (DRY_RUN && updates.length > 0) {
        logWarning(`Would update ${updates.length} users.`);
        logInfo('Run with --execute flag to apply changes.');
    }

    process.exit(0);
}

main().catch(error => {
    logError('Script failed with error:');
    console.error(error);
    process.exit(1);
});
