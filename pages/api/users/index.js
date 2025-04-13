// File: /pages/api/users/index.js

import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import { slugUsername } from '@/lib/user';
import { validateBody } from '@/api-lib/middlewares';
// Import Firebase Admin SDK (ensure that this file is set up to initialize the SDK)
import admin from '@/lib/firebase-admin';

const handler = nc(ncOpts);

/**
 * Verify the Firebase ID token from the request and return the UID.
 * Looks for the token in the Authorization header (Bearer token) or in cookies.
 *
 * @param {Object} req - The Next.js API request object.
 * @returns {Promise<string|null>} The UID if verified, or null if not authenticated.
 */
async function getFirebaseUid(req) {
  let token = req.headers.authorization?.replace(/^Bearer\s/, '');
  if (!token && req.cookies && req.cookies['firebaseToken']) {
    token = req.cookies['firebaseToken'];
  }
  if (!token) {
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}

handler.post(
  validateBody({
    type: 'object',
    properties: {
      // Although the uid field remains for backward compatibility, it won't be used when Firebase Auth is enabled.
      uid: { type: 'string' },
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
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  }),

  async (req, res) => {
    try {
      const db = await getMongoDb();

      // Verify the Firebase ID token from the request.
      const uid = await getFirebaseUid(req);
      if (!uid) {
        return res.status(401).json({
          error: 'Not authenticated. Firebase token missing or invalid.',
        });
      }

      // Extract form fields from the request body
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

      // Sanitize the username (e.g. convert to a slug format)
      username = slugUsername(username || '');

      const now = new Date();

      // Upsert the user document in MongoDB using the Firebase UID as the key.
      const result = await db.collection('users2').findOneAndUpdate(
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
