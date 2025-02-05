// pages/api/spotify/exchange-token.js
import axios from "axios";
import { saveSpotifyTokens } from "@/api-lib/db";
import { getMongoDb } from "@/api-lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, uid } = req.body; // Expect both code and uid
  if (!code || !uid) {
    return res.status(400).json({ error: "Missing authorization code or uid" });
  }

  // Use environment variables for sensitive data.
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("One or more Spotify environment variables are missing.");
    return res.status(500).json({
      error: "Server configuration error: missing environment variables",
    });
  }

  const tokenUrl = "https://accounts.spotify.com/api/token";
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  try {
    // Request tokens from Spotify
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Connect to the database and save tokens by uid.
    const db = await getMongoDb();
    await saveSpotifyTokens(db, {
      uid,
      access_token,
      refresh_token,
      expires_in,
    });

    return res.status(200).json({ access_token, refresh_token, expires_in });
  } catch (err) {
    console.error(
      "Error exchanging Spotify token:",
      err?.response?.data || err
    );
    return res.status(500).json({ error: "Token exchange failed" });
  }
}
