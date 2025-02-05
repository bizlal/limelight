// pages/api/spotify/recently-played.js
import axios from 'axios';
import {
  findSpotifyTokens,
  saveRecentlyPlayedTracks,
  saveSpotifyTokens,
} from '@/api-lib/db/connections';
import { getMongoDb } from '@/api-lib/mongodb';

async function refreshSpotifyToken(db, tokens) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify client credentials');
  }
  if (!tokens.refresh_token) {
    throw new Error('Missing refresh token.');
  }
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });
  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
    });
    const {
      access_token,
      expires_in,
      refresh_token: newRefreshToken,
    } = response.data;
    const updatedTokens = {
      access_token,
      refresh_token: newRefreshToken || tokens.refresh_token,
      expires_in,
      uid: tokens.uid,
    };
    await saveSpotifyTokens(db, updatedTokens);
    console.log('Token refreshed successfully:', updatedTokens);
    return updatedTokens;
  } catch (err) {
    console.error('Error refreshing Spotify token:', err.response?.data || err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid parameter.' });
  }

  try {
    const db = await getMongoDb();
    const tokens = await findSpotifyTokens(db, uid);
    console.log('Retrieved tokens for uid:', uid, tokens);

    if (!tokens || !tokens.access_token) {
      return res.status(401).json({
        error:
          'No valid Spotify token found for this user. Please connect Spotify first.',
      });
    }

    const recentlyPlayedCollection = db.collection('recentlyPlayed');
    const cachedTracks = await recentlyPlayedCollection
      .find({ uid })
      .sort({ played_at: -1 })
      .limit(10)
      .toArray();

    console.log('Cached tracks:', cachedTracks);
    if (cachedTracks && cachedTracks.length > 0) {
      return res.status(200).json({
        message: 'Recently played tracks fetched from database successfully.',
        count: cachedTracks.length,
        recentlyPlayed: cachedTracks,
      });
    }

    const recentlyPlayedUrl =
      'https://api.spotify.com/v1/me/player/recently-played?limit=10';
    let spotifyResponse;
    try {
      spotifyResponse = await axios.get(recentlyPlayedUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('Access token expired. Refreshing token...');
        const newTokens = await refreshSpotifyToken(db, tokens);
        if (!newTokens || !newTokens.access_token) {
          return res.status(401).json({
            error: 'Spotify access token expired and refresh failed.',
          });
        }
        spotifyResponse = await axios.get(recentlyPlayedUrl, {
          headers: { Authorization: `Bearer ${newTokens.access_token}` },
        });
      } else {
        throw err;
      }
    }

    console.log('Spotify response data:', spotifyResponse.data);
    const recentlyPlayed = spotifyResponse.data.items;
    console.log('Recently played tracks:', recentlyPlayed);

    if (!recentlyPlayed || !Array.isArray(recentlyPlayed)) {
      return res
        .status(500)
        .json({ error: 'Failed to retrieve recently played tracks.' });
    }

    await saveRecentlyPlayedTracks(db, uid, recentlyPlayed);
    return res.status(200).json({
      message:
        'Recently played tracks fetched from Spotify and stored successfully.',
      count: recentlyPlayed.length,
      recentlyPlayed,
    });
  } catch (error) {
    console.error(
      'Error fetching or storing recently played tracks:',
      error.response?.data || error.message || error
    );
    return res.status(500).json({
      error: 'An error occurred while fetching recently played tracks.',
    });
  }
}
