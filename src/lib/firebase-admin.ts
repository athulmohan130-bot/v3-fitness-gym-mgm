import "server-only";
import admin from "firebase-admin";

interface FirebaseAdminConfig {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
}

function formatPrivateKey(key: string) {
    return key.replace(/\\n/g, "\n");
}

export function initAdmin() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: formatPrivateKey(privateKey),
            }),
        });
    }

    // Fallback for local development or builds where env vars are not set
    try {
        // Try to load serviceAccountKey.json if it exists
        // This allows local builds to work even if NODE_ENV is production
        const serviceAccount = require("../serviceAccountKey.json");
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        // Ignore error if file doesn't exist, we'll throw below
    }

    throw new Error(
        "Failed to initialize Firebase Admin. Please check your environment variables."
    );
}

export const firebaseAdmin = initAdmin();
