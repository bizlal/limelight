import nc from "next-connect";
import { getMongoDb } from "@/api-lib/mongodb";
import { ncOpts } from "@/api-lib/nc";
import { slugUsername } from "@/lib/user";
import { validateBody } from "@/api-lib/middlewares";
import { PrivyClient } from "@privy-io/server-auth";

// Make sure you have your Privy credentials
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

// Reuse or create a helper function
async function verifyPrivyToken(req) {
  const headerAuthToken = req.headers.authorization?.replace(/^Bearer\s/, "");
  const cookieAuthToken = req.cookies["privy-token"];
  const token = cookieAuthToken || headerAuthToken;
  if (!token) throw new Error("Missing Privy token");

  const claims = await privyClient.verifyAuthToken(token);
  if (!claims) throw new Error("Invalid Privy token");
  // claims.sub = "did:privy:XXXXXXXXX"
  return claims;
}

const handler = nc(ncOpts);

handler.post(
  validateBody({
    type: "object",
    properties: {
      username: { type: "string", minLength: 4, maxLength: 20 },
      name: { type: "string" },
      userType: { type: "string" },
      hometown: { type: "string" },
      profileImage: { type: "string" },
      headerImage: { type: "string" },
      genres: {
        type: "array",
        items: { type: "string" },
      },
      bio: { type: "string", minLength: 0, maxLength: 160 },
      total_following: { type: "number" },
      total_followers: { type: "number" },
      links: {
        type: "object",
        properties: {
          website: { type: "string", nullable: true },
          spotify: { type: "string", nullable: true },
          itunes: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
          twitter: { type: "string", nullable: true },
          tiktok: { type: "string", nullable: true },
          youtube: { type: "string", nullable: true },
        },
      },
    },
    additionalProperties: false,
  }),

  async (req, res) => {
    try {
      const db = await getMongoDb();

      // 1) Verify Privy token, get uid
      const claims = await verifyPrivyToken(req);
      const uid = claims.userId.split(":")[2]; // Extract the third part of "did:privy:{userid}"

      // 2) Extract form fields
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
      username = slugUsername(username || "");

      // 3) Upsert the user doc by uid
      const now = new Date();
      const result = await db.collection("users").findOneAndUpdate(
        { uid },
        {
          $setOnInsert: {
            uid,
            createdAt: now,
          },
          $set: {
            username,
            name: name || "",
            userType: userType || "fan",
            hometown: hometown || "",
            profileImage: profileImage || "",
            headerImage: headerImage || "",
            genres: genres || [],
            bio: bio || "",
            total_following: total_following || 0,
            total_followers: total_followers || 0,
            links: links || {},
            updatedAt: now,
          },
        },
        { upsert: true, returnDocument: "after" }
      );

      return res.status(201).json({ user: result.value });
    } catch (err) {
      console.error("Sign-up error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default handler;
