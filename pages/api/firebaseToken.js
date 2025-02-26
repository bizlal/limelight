// pages/api/firebaseToken.js
import nc from 'next-connect';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // It's recommended to store your service account credentials as a JSON string in an environment variable.
  // For example, add the following to your .env.local file:
  // FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "...", "project_id": "...", ... }'
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const handler = nc();

/**
 * POST /api/firebaseToken
 * - Expects a JSON body with { address: string }
 * - Returns a Firebase custom token for the provided wallet address.
 */
handler.post(async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Missing address' });
  }

  try {
    // Use the wallet address as the UID. Adjust if you have a different user ID strategy.
    const customToken = await admin.auth().createCustomToken(address);
    return res.status(200).json({ token: customToken });
  } catch (error) {
    console.error('Error creating custom token:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default handler;
