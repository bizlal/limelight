// pages/api/users/username-check.js
import { getMongoDb } from "@/api-lib/mongodb";

export default async function handler(req, res) {
  try {
    const { username } = req.query; // e.g. "john_smith"
    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }

    const db = await getMongoDb();
    const existing = await db.collection("users").findOne({ username });
    const available = !existing; // if no user found, it's available
    return res.status(200).json({ available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
