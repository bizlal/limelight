// /pages/api/user/index.js
import multer from 'multer';
import nc from 'next-connect';
import { v2 as cloudinary } from 'cloudinary';

import { getMongoDb } from '@/api-lib/mongodb';
import { findUserByUsername, updateUserById } from '@/api-lib/db';
import { slugUsername } from '@/lib/user';
import { ncOpts } from '@/api-lib/nc';
import { ValidateProps } from '@/api-lib/constants';
// A custom helper that verifies the Privy token and fetches the user doc
import { verifyPrivyAndGetUser } from '@/api-lib/privy';

const upload = multer({ dest: '/tmp' });

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
 * GET /api/user
 *  - Verifies Privy token
 *  - Returns { user } if found, or { user: null } if not
 */
handler.get(async (req, res) => {
  try {
    const { dbUser } = await verifyPrivyAndGetUser(req);
    if (!dbUser) {
      return res.json({ user: null });
    }
    return res.json({ user: dbUser });
  } catch (err) {
    console.error('GET /api/user error:', err);
    return res.status(401).json({ error: err.message });
  }
});

/**
 * PATCH /api/user
 *  - Verifies Privy token
 *  - Expects multipart form-data with optional files (profilePicture, headerImage)
 *  - Validates username, name, bio
 *  - Uploads images to Cloudinary
 *  - Updates user doc
 */
handler.patch(
  upload.single('profilePicture'), // or .fields([{ name: 'profilePicture' }, { name: 'headerImage' }]) if multiple
  async (req, res, next) => {
    // Minimal manual parse of text fields from form-data
    try {
      const { username, name, bio } = ValidateProps.user.properties;

      const parsedBody = {
        username: req.body.username,
        name: req.body.name,
        bio: req.body.bio,
      };

      // Example basic validation
      if (
        parsedBody.username &&
        parsedBody.username.length < username.minLength
      ) {
        throw new Error('Username too short');
      }

      req.parsedBody = parsedBody;
      return next();
    } catch (err) {
      console.error('Validation error:', err);
      return res.status(400).json({ error: err.message });
    }
  },
  async (req, res) => {
    try {
      // 1) Verify Privy token + get local user
      const { dbUser } = await verifyPrivyAndGetUser(req);
      if (!dbUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const db = await getMongoDb();

      // 2) Upload profile picture if provided
      let profilePicture;
      if (req.file) {
        // Example: If you want to rename the field to 'profilePicture' in Cloudinary
        const image = await cloudinary.uploader.upload(req.file.path, {
          width: 512,
          height: 512,
          crop: 'fill',
        });
        profilePicture = image.secure_url;
      }

      // 3) Prepare updated fields
      const { name, bio } = req.parsedBody;
      let { username } = req.parsedBody;

      if (username) {
        username = slugUsername(username);
        if (username !== dbUser.username) {
          // Check uniqueness
          const existing = await findUserByUsername(db, username);
          if (existing) {
            return res.status(403).json({ error: 'That username is taken.' });
          }
        }
      }

      const updatedData = {};
      if (username) updatedData.username = username;
      if (typeof name === 'string') updatedData.name = name;
      if (typeof bio === 'string') updatedData.bio = bio;
      if (profilePicture) updatedData.profilePicture = profilePicture;
      updatedData.updatedAt = new Date();

      // 4) Update user
      const user = await updateUserById(db, dbUser._id, updatedData);

      return res.json({ user });
    } catch (err) {
      console.error('PATCH /api/user error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// Because we use multer, disable the default Next.js body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
