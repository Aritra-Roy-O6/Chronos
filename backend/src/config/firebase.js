import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount;

// 1. Check if running in the cloud with an Environment Variable (Render/Vercel)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ Firebase credentials loaded from Environment Variable.");
    } catch (error) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable. Ensure it is valid JSON.");
        process.exit(1);
    }
} 
// 2. Fall back to local file for development
else {
    // Go up two directories to find the key in the backend root
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log("✅ Firebase credentials loaded from local serviceAccountKey.json file.");
    } else {
        console.error("❌ ERROR: Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json");
        process.exit(1);
    }
}

// Initialize Firebase Admin
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const adminAuth = getAuth();

console.log("✅ Firebase Admin initialized successfully.");

export { db, FieldValue, adminAuth };