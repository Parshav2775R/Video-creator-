import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required");
  }

  // Use Application Default Credentials approach with project ID
  // Since we don't have a service account key file, we initialize with just project ID
  // and use the REST API for Firestore operations
  return initializeApp({ projectId });
}

let _db: ReturnType<typeof getFirestore> | null = null;

export function getDb(): ReturnType<typeof getFirestore> {
  if (!_db) {
    initFirebase();
    _db = getFirestore();
  }
  return _db;
}
