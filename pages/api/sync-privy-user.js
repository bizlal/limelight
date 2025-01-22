// /pages/api/sync-privy-user.js
import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { PrivyClient } from '@privy-io/server-auth';

// Load your Privy credentials from environment variables
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

// Instantiate the Privy client
const client = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

const handler = nc();

handler.post(async (req, res) => {
  try {
    // 1. Extract token from either Authorization header or "privy-token" cookie
    const headerAuthToken = req.headers.authorization?.replace(/^Bearer\s/, '');
    const cookieAuthToken = req.cookies['privy-token'];
    const token = cookieAuthToken || headerAuthToken;

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    // 2. Verify token with Privy
    //    Throws an error if invalid or expired.
    const claims = await client.verifyAuthToken(token);
    if (!claims) {
      return res.status(401).json({ error: 'Invalid Privy token' });
    }
    console.log(claims);
    // 3. Pull the relevant fields from the request body
    const { uid, email } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in request body' });
    }

    // 4. Confirm uid matches the token claims
    //    Typically, claims.sub == 'did:privy:xxxx'
    console.log('claims.sub:', claims.sub);
    console.log('uid:', uid);
    if (claims.userId !== uid) {
      return res.status(403).json({ error: 'Token sub does not match uid' });
    }

    // 5. Upsert into your local MongoDB
    const db = await getMongoDb();
    const result = await db.collection('users').findOneAndUpdate(
      { uid }, // Query by uid
      {
        $setOnInsert: {
          uid,
          createdAt: new Date(),
        },
        $set: {
          email,
          updatedAt: new Date(),
          // ...any other fields you want to store
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    const userDoc = result.value;
    return res.status(200).json({ user: userDoc });
  } catch (err) {
    console.error('Error in /api/sync-privy-user', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default handler;
