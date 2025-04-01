import admin from "firebase-admin";
import { readFileSync } from "fs";

// Prevent re-initializing in dev
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync("firebase-service-account.json", "utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

export { admin, bucket };
