import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import { slugUsername } from '@/lib/user';
import { validateBody } from '@/api-lib/middlewares';
import { fetcher } from '@/lib/fetch'; // or your Privy client
import { PrivyClient } from '@privy-io/server-auth';
import { ObjectId } from 'mongodb';
import { constants } from '@/api-lib/constants';

// Make sure you have your Privy credentials
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

// Reuse or create a helper function
async function verifyPrivyToken(req) {
  const headerAuthToken = req.headers.authorization?.replace(/^Bearer\s/, '');
  const cookieAuthToken = req.cookies['privy-token'];
  const token = cookieAuthToken || headerAuthToken;
  if (!token) throw new Error('Missing Privy token');

  const claims = await privyClient.verifyAuthToken(token);
  if (!claims) throw new Error('Invalid Privy token');
  // claims.sub = "did:privy:XXXXXXXXX"
  return claims;
}

const handler = nc(ncOpts);

handler.post(
  validateBody(constants.ValidateProps.signUpUser),

  // No ...auths if you don’t need session-based checks; we’ll handle privy token manually
  async (req, res) => {
    try {
      const db = await getMongoDb();

      // 1) Verify Privy token, get privyId
      const claims = await verifyPrivyToken(req);
      const privyId = claims.userId; // e.g. "did:privy:cm65nf7it01h5rnkv5esk5hl4"

      // 2) Extract form fields
      let { username, name, userType, hometown, genres } = req.body;
      username = slugUsername(username || '');

      // 3) Upsert the user doc by privyId
      //    If a doc with this privyId already exists, update it; else insert a new one.
      const now = new Date();
      const result = await db.collection('users').findOneAndUpdate(
        { privyId }, // match the doc with this privyId
        {
          $setOnInsert: {
            privyId,
            createdAt: now,
          },
          $set: {
            username,
            name: name || '',
            userType: userType || 'fan',
            hometown: hometown || '',
            genres: genres || [],
            updatedAt: now,
            // If you also want to store the user's email from Privy, you could set it here if known
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      return res.status(201).json({ user: result.value });
    } catch (err) {
      console.error('Sign-up error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default handler;
