// File: lib/firebase-admin.js

import admin from 'firebase-admin';

// Check if the Firebase Admin SDK has already been initialized to prevent
// re-initialization during hot-reloading in development.
if (!admin.apps.length) {
  // Validate that required environment variables are present.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase credentials. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables are set.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // Replace escaped newline characters with actual newlines.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    // Optionally include the databaseURL if using Firebase Realtime Database.
    databaseURL: databaseURL || undefined,
  });
}

export default admin;
