// File: /pages/api/users/index.js

import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import { slugUsername } from '@/lib/user';
import { validateBody } from '@/api-lib/middlewares';
import { PrivyClient } from '@privy-io/server-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

// Only create a Privy client if credentials exist
const privyClient =
  PRIVY_APP_ID && PRIVY_APP_SECRET
    ? new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET)
    : null;

// Optional token verification
async function getOptionalPrivyUid(req) {
  if (!privyClient) {
    // If you have no Privy credentials in environment, skip entirely
    return null;
  }

  try {
    const headerAuthToken = req.headers.authorization?.replace(/^Bearer\s/, '');
    const cookieAuthToken = req.cookies['privy-token'];
    const token = cookieAuthToken || headerAuthToken;
    if (!token) {
      // No token provided
      return null;
    }

    // Attempt to verify
    const claims = await privyClient.verifyAuthToken(token);
    if (!claims || !claims.userId?.includes('did:privy:')) {
      // Token invalid
      return null;
    }

    // e.g. "did:privy:XXXXXXXX" -> "XXXXXXXX"
    return claims.userId.split(':')[2];
  } catch (err) {
    // If verification fails, treat as no token
    console.error('Optional Privy verification failed:', err);
    return null;
  }
}

const handler = nc(ncOpts);

handler.post(
  validateBody({
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 4, maxLength: 20 },
      name: { type: 'string' },
      userType: { type: 'string' },
      hometown: { type: 'string' },
      profileImage: { type: 'string' },
      headerImage: { type: 'string' },
      genres: {
        type: 'array',
        items: { type: 'string' },
      },
      bio: { type: 'string', minLength: 0, maxLength: 160 },
      total_following: { type: 'number' },
      total_followers: { type: 'number' },
      links: {
        type: 'object',
        properties: {
          website: { type: 'string', nullable: true },
          spotify: { type: 'string', nullable: true },
          itunes: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          twitter: { type: 'string', nullable: true },
          tiktok: { type: 'string', nullable: true },
          youtube: { type: 'string', nullable: true },
        },
      },
    },
    additionalProperties: false,
  }),

  async (req, res) => {
    try {
      const db = await getMongoDb();

      // 1) Attempt to get uid from an optional Privy token
      const privyUid = await getOptionalPrivyUid(req);

      // 2) Fall back to a 'uid' in the request body if no Privy token
      //    or you can generate a random ID, or throw an error if none is found
      const fallbackUid = req.body.uid; // e.g. from your auth system / client
      const uid = privyUid || fallbackUid;

      if (!uid) {
        return res.status(400).json({
          error: 'No user ID found (no Privy token + no fallback uid in body).',
        });
      }

      // 3) Extract form fields
      let {
        username,
        name,
        userType,
        hometown,
        profileImage,
        headerImage,
        genres,
        bio,
        total_following,
        total_followers,
        links,
      } = req.body;

      username = slugUsername(username || '');

      const now = new Date();

      // 4) Upsert the user doc by uid
      const result = await db.collection('users').findOneAndUpdate(
        { uid },
        {
          $setOnInsert: {
            uid,
            createdAt: now,
          },
          $set: {
            username,
            name: name || '',
            userType: userType || 'fan',
            hometown: hometown || '',
            profileImage: profileImage || '',
            headerImage: headerImage || '',
            genres: genres || [],
            bio: bio || '',
            total_following: total_following || 0,
            total_followers: total_followers || 0,
            links: links || {},
            updatedAt: now,
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
