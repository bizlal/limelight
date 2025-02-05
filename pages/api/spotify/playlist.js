// pages/api/spotify/add-to-discovered-playlist.js

import { getMongoDb } from '@/api-lib/mongodb';
import { findSpotifyTokens, saveSpotifyTokens } from '@/api-lib/db/connections';
import {
  createOrGetDiscoveredPlaylist,
  addTracksToDiscoveredPlaylist,
} from '@/api-lib/db';
import axios from 'axios';

/**
 * Helper: Refresh the user's Spotify token if it's expired or near expiry.
 * This uses the refresh token to get a new access token.
 *
 * @param {string} uid
 * @param {import('mongodb').Db} db
 * @param {Object} tokensDoc
 * @returns {Promise<Object>} Updated tokensDoc with a valid access_token.
 */
async function ensureValidAccessToken(uid, db, tokensDoc) {
  // We'll assume you store the token's expiry time & updatedAt in `tokensDoc`.
  // If the token is expired (or about to expire), refresh it.

  // For simplicity, let's say if more than ~3500 seconds have passed since 'updatedAt',
  // we consider the token expired. (Or you can store an 'expires_at' value.)
  const now = Date.now();
  const updatedAt = tokensDoc.updatedAt
    ? new Date(tokensDoc.updatedAt).getTime()
    : 0;
  const expiresInMs = (tokensDoc.expires_in || 3600) * 1000;
  const timeElapsed = now - updatedAt;
  const isExpired = timeElapsed >= expiresInMs;

  if (!isExpired) {
    // Not expired yet
    return tokensDoc;
  }

  // If we have no refresh token, we can't refresh. Throw error or handle gracefully.
  if (!tokensDoc.refresh_token) {
    throw new Error('No refresh token found. Cannot refresh access token.');
  }

  console.log('Refreshing Spotify token for user:', uid);

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Spotify client credentials. Cannot refresh token.'
    );
  }

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokensDoc.refresh_token,
  });

  // Request new token from Spotify
  const response = await axios.post(tokenUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
  });

  const { access_token, expires_in } = response.data;
  // Save the updated tokens (note: keep the old refresh token; Spotify might or might not return a new one).
  const updatedTokensDoc = {
    ...tokensDoc,
    access_token,
    expires_in,
    updatedAt: new Date(),
  };

  await saveSpotifyTokens(db, {
    uid,
    access_token,
    refresh_token: tokensDoc.refresh_token,
    expires_in,
  });

  // Return the new tokensDoc
  return updatedTokensDoc;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uid, trackUris } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing user ID (uid).' });
    }
    if (!Array.isArray(trackUris) || trackUris.length === 0) {
      return res.status(400).json({
        error: 'trackUris must be a non-empty array of Spotify URIs.',
      });
    }

    // 1) Connect to DB and fetch tokens
    const db = await getMongoDb();
    let tokensDoc = await findSpotifyTokens(db, uid);

    if (!tokensDoc) {
      return res
        .status(401)
        .json({ error: 'Spotify tokens not found for this user.' });
    }

    // 2) Refresh token if expired
    tokensDoc = await ensureValidAccessToken(uid, db, tokensDoc);

    // 3) Make sure "Discovered on Limelight" playlist exists
    await createOrGetDiscoveredPlaylist(db, uid, tokensDoc.access_token);

    // 4) Add tracks to that playlist
    await addTracksToDiscoveredPlaylist(
      db,
      uid,
      tokensDoc.access_token,
      trackUris
    );

    return res.status(200).json({
      success: true,
      message:
        'Tracks added to "Discovered on Limelight" playlist successfully.',
    });
  } catch (error) {
    console.error('Error in /add-to-discovered-playlist handler:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
