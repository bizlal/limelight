// /pages/api/user/index.js
import multer from "multer";
import nc from "next-connect";
import { v2 as cloudinary } from "cloudinary";

import { getMongoDb } from "@/api-lib/mongodb";
import { findUserByUsername, updateUserById } from "@/api-lib/db";
import { slugUsername } from "@/lib/user";
import { ncOpts } from "@/api-lib/nc";
import { ValidateProps } from "@/api-lib/constants";
import { verifyPrivyAndGetUser } from "@/api-lib/privy";

const upload = multer({ dest: "/tmp" });

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
    console.error("GET /api/user error:", err);
    return res.status(401).json({ error: err.message });
  }
});

/**
 * PATCH /api/user
 *  - Verifies Privy token
 *  - Expects multipart form-data with optional files (profileImage, headerImage)
 *  - Handles all user fields: userType, username, name, bio, hometown, links, genres, images
 *  - Uploads images to Cloudinary if present
 *  - Updates user doc
 */
handler.patch(
  upload.fields([{ name: "profileImage" }, { name: "headerImage" }]),
  // (Optional) minimal validation step
  async (req, res, next) => {
    try {
      // Check the minimal length for username from your constants
      const { username: usernameProps } = ValidateProps.user.properties;
      const rawUsername = req.body.username || "";

      if (rawUsername && rawUsername.length < usernameProps.minLength) {
        throw new Error("Username too short");
      }

      return next();
    } catch (err) {
      console.error("Validation error:", err);
      return res.status(400).json({ error: err.message });
    }
  },
  async (req, res) => {
    try {
      // 1) Verify Privy token & get local user
      const { dbUser } = await verifyPrivyAndGetUser(req);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const db = await getMongoDb();

      // 2) Pull text fields from req.body
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

      // Slugify the username if provided
      if (username) {
        username = slugUsername(username);
      }

      // Parse genres JSON if provided
      let parsedGenres = [];
      if (genres) {
        try {
          parsedGenres = JSON.parse(genres);
          if (!Array.isArray(parsedGenres)) {
            throw new Error("Genres must be an array");
          }
        } catch (err) {
          console.error("Could not parse genres:", err);
          return res
            .status(400)
            .json({ error: "Genres must be valid JSON array" });
        }
      }

      // 3) If username changed, check uniqueness
      if (username && username !== dbUser.username) {
        const existing = await findUserByUsername(db, username);
        if (existing) {
          return res.status(403).json({ error: "That username is taken." });
        }
      }

      // 4) Upload images to Cloudinary (if files present)
      let profileImage, headerImage;
      if (req.files) {
        if (req.files.profileImage) {
          const uploadRes = await cloudinary.uploader.upload(
            req.files.profileImage[0].path,
            {
              width: 512,
              height: 512,
              crop: "fill",
            }
          );
          profileImage = uploadRes.secure_url;
        }
        if (req.files.headerImage) {
          const uploadRes = await cloudinary.uploader.upload(
            req.files.headerImage[0].path,
            {
              width: 1500,
              height: 500,
              crop: "fill",
            }
          );
          headerImage = uploadRes.secure_url;
        }
      }

      // 5) Build the updatedData object
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

      // Handle links as a nested object
      const linksObj = {
        website: website || "",
        spotify: spotify || "",
        itunes: itunes || "",
        instagram: instagram || "",
        twitter: twitter || "",
        tiktok: tiktok || "",
        youtube: youtube || "",
      };
      // If you want to do partial updates, you'd merge with existing `dbUser.links`
      // But for simplicity, let's just overwrite the entire object:
      updatedData.links = linksObj;

      // 6) Update the user in DB
      const user = await updateUserById(db, dbUser._id, updatedData);

      return res.json({ user });
    } catch (err) {
      console.error("PATCH /api/user error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// Disable default body parser because we use multer
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
