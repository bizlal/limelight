// /api-lib/privy.js
import { PrivyClient } from "@privy-io/server-auth";
import { getMongoDb } from "./mongodb";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

// Create a reusable Privy client
export const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

/**
 * Verifies the Privy token from headers/cookies and loads the local user doc.
 * Returns { dbUser, claims } or throws if invalid/missing.
 */
export async function verifyPrivyAndGetUser(req) {
  // 1) Extract token from Authorization header or privy-token cookie
  const authHeader = req.headers.authorization || "";
  const token =
    authHeader.replace(/^Bearer\s/, "") || req.cookies["privy-token"];
  if (!token) {
    throw new Error("Missing Privy token");
  }

  // 2) Verify with Privy
  const claims = await privyClient.verifyAuthToken(token);
  if (!claims) {
    throw new Error("Invalid Privy token");
  }
  // claims.userId should be something like "did:privy:xxxx"
  const uid = claims.userId.split(":")[2];
  if (!uid) {
    throw new Error("Invalid Privy userId format");
  }

  // 3) Look up user in MongoDB
  const db = await getMongoDb();
  const dbUser = await db.collection("users").findOne({ uid });
  if (!dbUser) {
    throw new Error("User not found in DB");
  }

  req.user = dbUser; // Attach user to the request

  console.log("User found:", dbUser);
  console.log("Privy claims:", claims);
  return { dbUser, claims };
}
