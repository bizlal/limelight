// /pages/api/user/index.js
import multer from 'multer';
import nc from 'next-connect';
import { v2 as cloudinary } from 'cloudinary';

import { getMongoDb } from '@/api-lib/mongodb';
import {
  findUserByUsername,
  updateUserById,
  findUserByUid,
} from '@/api-lib/db';
import { slugUsername } from '@/lib/user';
import { ncOpts } from '@/api-lib/nc';
import { ValidateProps } from '@/api-lib/constants';
import admin from '@/lib/firebase-admin';

const upload = multer({ dest: '/tmp' });

// Configure Cloudinary if provided
if (process.env.CLOUDINARY_URL) {
  const {
    hostname: cloud_name,
    username: api_key,
    password: api_secret,
  } = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
  });
}

const handler = nc(ncOpts);

/**
 * Helper: Verify Firebase token from request and return corresponding DB user.
 * It looks for the token in the Authorization header or cookies.
 */
async function getFirebaseUserFromRequest(req) {
  const token =
    req.headers.authorization?.replace(/^Bearer\s/, '') ||
    req.cookies?.firebaseToken;
  if (!token) {
    throw new Error('No Firebase token provided');
  }
  const decodedToken = await admin.auth().verifyIdToken(token);
  const firebaseUid = decodedToken.uid;
  const db = await getMongoDb();
  const user = await findUserByUid(db, firebaseUid);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

/**
 * GET /api/user
 *  - Verifies Firebase token
 *  - Returns { user } if found, or { user: null } if not
 */
handler.get(async (req, res) => {
  try {
    const dbUser = await getFirebaseUserFromRequest(req);
    return res.json({ user: dbUser });
  } catch (err) {
    console.error('GET /api/user error:', err);
    return res.status(401).json({ error: err.message });
  }
});

/**
 * PATCH /api/user
 *  - Verifies Firebase token
 *  - Expects multipart form-data with optional files (profileImage, headerImage)
 *  - Handles all user fields: userType, username, name, bio, hometown, links, genres, images
 *  - Uploads images to Cloudinary if present
 *  - Updates user document in the database
 */
handler.patch(
  upload.fields([{ name: 'profileImage' }, { name: 'headerImage' }]),
  // Minimal validation for username length
  async (req, res, next) => {
    try {
      const { username: usernameProps } = ValidateProps.user.properties;
      const rawUsername = req.body.username || '';
      if (rawUsername && rawUsername.length < usernameProps.minLength) {
        throw new Error('Username too short');
      }
      return next();
    } catch (err) {
      console.error('Validation error:', err);
      return res.status(400).json({ error: err.message });
    }
  },
  async (req, res) => {
    try {
      // 1) Verify Firebase token and get local user from DB.
      const dbUser = await getFirebaseUserFromRequest(req);
      const db = await getMongoDb();

      // 2) Extract text fields from req.body.
      let {
        userType,
        username,
        name,
        bio,
        hometown,
        website,
        spotify,
        itunes,
        instagram,
        twitter,
        tiktok,
        youtube,
        genres,
      } = req.body;

      // Slugify username if provided.
      if (username) {
        username = slugUsername(username);
      }

      // Parse genres JSON if provided.
      let parsedGenres = [];
      if (genres) {
        try {
          parsedGenres = JSON.parse(genres);
          if (!Array.isArray(parsedGenres)) {
            throw new Error('Genres must be an array');
          }
        } catch (err) {
          console.error('Could not parse genres:', err);
          return res
            .status(400)
            .json({ error: 'Genres must be valid JSON array' });
        }
      }

      // 3) If username changed, verify that it is unique.
      if (username && username !== dbUser.username) {
        const existing = await findUserByUsername(db, username);
        if (existing) {
          return res.status(403).json({ error: 'That username is taken.' });
        }
      }

      // 4) Upload images to Cloudinary if files are present.
      let profileImage, headerImage;
      if (req.files) {
        if (req.files.profileImage) {
          const uploadRes = await cloudinary.uploader.upload(
            req.files.profileImage[0].path,
            { width: 512, height: 512, crop: 'fill' }
          );
          profileImage = uploadRes.secure_url;
        }
        if (req.files.headerImage) {
          const uploadRes = await cloudinary.uploader.upload(
            req.files.headerImage[0].path,
            { width: 1500, height: 500, crop: 'fill' }
          );
          headerImage = uploadRes.secure_url;
        }
      }

      // 5) Build the update data object.
      const updatedData = {
        updatedAt: new Date(),
      };
      if (userType) updatedData.userType = userType;
      if (username) updatedData.username = username;
      if (name !== undefined) updatedData.name = name;
      if (bio !== undefined) updatedData.bio = bio;
      if (hometown !== undefined) updatedData.hometown = hometown;
      if (parsedGenres.length > 0) updatedData.genres = parsedGenres;
      if (profileImage) updatedData.profileImage = profileImage;
      if (headerImage) updatedData.headerImage = headerImage;

      // Handle links as a nested object.
      const linksObj = {
        website: website || '',
        spotify: spotify || '',
        itunes: itunes || '',
        instagram: instagram || '',
        twitter: twitter || '',
        tiktok: tiktok || '',
        youtube: youtube || '',
      };
      updatedData.links = linksObj;

      // 6) Update the user in the database.
      const user = await updateUserById(db, dbUser._id, updatedData);
      return res.json({ user });
    } catch (err) {
      console.error('PATCH /api/user error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// Disable the default Next.js body parser because we're using multer.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
