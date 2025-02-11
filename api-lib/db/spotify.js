// /api-lib/db/spotifyPlaylist.js

import axios from 'axios';
import { findSpotifyTokens, saveSpotifyTokens } from './connections.js';

/**
 * Returns the user's Spotify profile.
 * We need this to get the Spotify user ID (so we can create a playlist for them).
 */
async function getSpotifyProfile(accessToken) {
  const response = await axios.get('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data; // e.g. { display_name, id, email, ... }
}

/**
 * Creates (or retrieves) the "Discovered on Limelight" playlist for a user.
 * - If we have 'discovered_playlist_id' stored, we return it.
 * - Otherwise, we create a new playlist and store it.
 *
 * @param {import('mongodb').Db} db - The connected database instance.
 * @param {string} uid - Your internal user ID (who is logged in).
 * @param {string} accessToken - The valid Spotify access token for this user.
 *
 * @returns {Promise<string>} The ID of the "Discovered on Limelight" playlist.
 */
export async function createOrGetDiscoveredPlaylist(db, uid, accessToken) {
  // First, see if we already have a playlist ID saved in the tokens doc.
  const tokensDoc = await findSpotifyTokens(db, uid);
  console.log('Found tokens doc:', tokensDoc);
  if (!tokensDoc) {
    throw new Error(`No tokens found for user ${uid}. Cannot create playlist.`);
  }

  if (tokensDoc.discovered_playlist_id) {
    // We already have a "Discovered on Limelight" playlist
    return tokensDoc.discovered_playlist_id;
  }

  // Otherwise, we need to create the playlist on Spotify
  const userProfile = await getSpotifyProfile(accessToken);
  const spotifyUserId = userProfile.id; // The user's Spotify ID

  // Create the playlist using Spotify API
  // POST /v1/users/{user_id}/playlists
  const createRes = await axios.post(
    `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
    {
      name: 'Discovered on Limelight',
      description: 'A special playlist curated by Limelight',
      public: false,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const playlistId = createRes.data.id;
  // Save that playlist ID in the tokens doc so we don't re-create
  await saveSpotifyTokens(db, {
    uid,
    access_token: tokensDoc.access_token,
    refresh_token: tokensDoc.refresh_token,
    expires_in: tokensDoc.expires_in,
  });
  // We'll do a separate direct update of the discovered_playlist_id
  await db
    .collection('user_connections')
    .updateOne(
      { service: 'spotify', uid },
      { $set: { discovered_playlist_id: playlistId } }
    );

  return playlistId;
}

/**
 * Adds track URIs to the user's "Discovered on Limelight" playlist.
 * - If we don't have an existing discoveredPlaylistId, we create it.
 * - Then POST the URIs to /playlists/{playlistId}/tracks
 *
 * @param {import('mongodb').Db} db - The connected database instance.
 * @param {string} uid - Your internal user ID.
 * @param {string} accessToken - The user's Spotify access token.
 * @param {string[]} trackUris - Array of Spotify track URIs to add.
 * @returns {Promise<void>}
 */
export async function addTracksToDiscoveredPlaylist(
  db,
  uid,
  accessToken,
  trackUris
) {
  if (!Array.isArray(trackUris) || trackUris.length === 0) {
    // No tracks to add
    return;
  }

  // 1) Ensure we have a valid discoveredPlaylistId
  const discoveredPlaylistId = await createOrGetDiscoveredPlaylist(
    db,
    uid,
    accessToken
  );

  // 2) Add tracks
  // POST /v1/playlists/{playlist_id}/tracks
  await axios.post(
    `https://api.spotify.com/v1/playlists/${discoveredPlaylistId}/tracks`,
    {
      uris: trackUris, // e.g. ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", ...]
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}
// spotifyClient.js

// ============================================================================
// Constants (update these with your own credentials and redirect URI)
const clientId = 'cad0010433854df8a32000b92a73d369';
const clientSecret = '2a9f8e5dfa984a8fb122b8e542192eaf';
const redirectUri = 'https://limelight-server.vercel.app/api/spotify';

// ============================================================================
// Token Utility Functions
export const isAccessTokenExpired = (expiresAt) => {
  return Date.now() > expiresAt;
};

export const calculateAccessTokenExpirationTime = (expiresIn) => {
  return Date.now() + expiresIn * 1000;
};

// ============================================================================
// Helper: Create a Track Object from Spotify Track Data
const createTrackObject = (spotifyTrack, uid) => {
  return {
    track_id: crypto.randomUUID(),
    uid,
    metadata: {
      duration: spotifyTrack.duration_ms,
      artist: spotifyTrack.artists?.[0]?.name || '',
      featured_artists:
        spotifyTrack.artists && spotifyTrack.artists.length > 1
          ? spotifyTrack.artists
              .slice(1)
              .map((artist) => artist.name)
              .join(', ')
          : '',
      album_title: spotifyTrack.album?.name || '',
      track_title: spotifyTrack.name || '',
      primary_genre: '', // Not available from Spotify API
      secondary_genre: '',
      language: 'English',
      release_type: spotifyTrack.album?.album_type || '',
      release_date: new Date(spotifyTrack.album?.release_date).getTime() || 0,
      isrc: spotifyTrack.external_ids?.isrc || '',
      cover_art: spotifyTrack.album?.images?.[0]?.url || '',
      file_size: 0,
      bitrate: 0,
      bpm: 0,
    },
    is_active: true,
    release_metrics: {
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_skips: 0,
      total_replays: 0,
      total_unique_listeners: 0,
      total_impressions: 0,
      dsp_clicks: {
        spotify: 0,
        apple_music: 0,
      },
      total_outreach: 0.0,
      total_shares: 0,
      total_comments: 0,
      total_reposts: 0,
      total_saves: 0,
    },
    clip_start_time: 0,
    tags: ['Hip Hop'], // Default tag (update as needed)
    genre: '',
    is_instrumental: false,
    is_explicit: spotifyTrack.explicit || false,
    mood: '',
    image_url: spotifyTrack.album?.images?.[0]?.url || '',
    audio_url: spotifyTrack.preview_url || '',
    video_url: '',
    dsp_links: {
      spotify: spotifyTrack.external_urls?.spotify || '',
      apple_music: '',
    },
    mongodb_location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    release_location: {
      city: '',
      state: '',
      country: '',
      continent: '',
      latitude: '0.0',
      longitude: '0.0',
      geohash: '',
    },
    spotify_obj: spotifyTrack, // Keep the original Spotify object for debugging
  };
};

// ============================================================================
// Database Functions
// Add the track object to your posts collection in the DB.
export const addSpotifyTrackToDb = async (db, uid, spotifyTrack) => {
  const trackObj = createTrackObject(spotifyTrack, uid);
  const posts = db.collection('user_posts');
  const result = await posts.insertOne(trackObj);
  console.log('Track added to posts collection:', result.insertedId);
  return trackObj;
};

// Returns the track object without inserting it into the DB.
export const getTrackFromSpotifyTrack = (uid, spotifyTrack) => {
  return createTrackObject(spotifyTrack, uid);
};

// ============================================================================
// Spotify API Functions
// Get a Spotify track by trackId and add it to the database.
export const getSpotifyTrackAndAddToDb = async (db, uid, trackId) => {
  try {
    const { accessToken } = await getToken(db, uid);
    console.log(trackId);
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const trackData = response.data;
    if (!trackData) {
      console.error('No track found for trackId:', trackId);
      throw new Error(`No track found for trackId: ${trackId}`);
    }
    return await addSpotifyTrackToDb(db, uid, trackData);
  } catch (error) {
    console.error('Error while fetching and adding track:', error);
    throw error;
  }
};

// Get a Spotify track by trackId and return the track object (without DB insertion).
export const getSpotifyTrackAndReturnTrack = async (db, uid, trackId) => {
  try {
    const { accessToken } = await getToken(db);
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const trackData = response.data;
    if (!trackData) {
      throw new Error(`No track found for trackId: ${trackId}`);
    }
    return getTrackFromSpotifyTrack(uid, trackData);
  } catch (error) {
    console.error('Error while fetching track:', error);
    throw error;
  }
};

// ============================================================================
// Token Management Functions
// Get the current Spotify token from the DB; refresh it if expired.
export const getToken = async (db, uid) => {
  try {
    const collection = db.collection('user_connections');
    // Look up the token by service and uid

    console.log('Getting Spotify token for uid:', uid);
    const tokenDoc = await collection.findOne({ service: 'spotify', uid });
    console.log('Token document:', tokenDoc);

    if (!tokenDoc) {
      console.log('No Spotify tokens found for uid:', uid);
      throw new Error(
        'No valid Spotify tokens available. Please connect your Spotify account.'
      );
    }
    let { accessToken, refreshToken, expiresAt, updatedAt } = tokenDoc;
    console.log('Access token:', accessToken);
    console.log('Refresh token:', refreshToken);
    console.log('Expires at:', expiresAt);
    console.log('Updated at:', updatedAt);

    if (!accessToken || isAccessTokenExpired(expiresAt)) {
      if (refreshToken) {
        console.log('Access token expired. Refreshing token...');
        const refreshedTokens = await refreshAccessToken(refreshToken);
        accessToken = refreshedTokens.accessToken;
        refreshToken = refreshedTokens.refreshToken;
        expiresAt = calculateAccessTokenExpirationTime(
          refreshedTokens.expiresIn
        );
        updatedAt = new Date();
        console.log('Refreshed access token:', accessToken);
        console.log('New refresh token:', refreshToken);
        console.log('New expires at:', expiresAt);
      } else {
        throw new Error(
          'No valid Spotify tokens available. Please connect your Spotify account.'
        );
      }

      await collection.updateOne(
        { service: 'spotify', uid },
        { $set: { accessToken, refreshToken, expiresAt, updatedAt } },
        { upsert: true }
      );

      console.log('Updated Spotify token:', accessToken);
    }
    return { accessToken, refreshToken, expiresAt, updatedAt };
  } catch (error) {
    console.error('Error while getting access token:', error);
    throw error;
  }
};

// Refresh the Spotify access token using axios.
export const refreshAccessToken = async (refreshToken) => {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  try {
    console.log('Refreshing Spotify access token...');
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
    });
    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
    } = response.data;
    console.log('New access token:', accessToken);
    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresIn,
    };
  } catch (error) {
    console.error(
      'Error while refreshing access token:',
      error.response?.data || error
    );
    throw error;
  }
};

// ============================================================================
// URL Parsing Functions
// Extract the Spotify track ID from a Spotify track URL.
export const parseSpotifyTrackUrl = (url) => {
  try {
    // Example URL: https://open.spotify.com/track/{trackId}?si=...
    const regex = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('Invalid Spotify track URL');
  } catch (error) {
    console.error('Error parsing Spotify track URL:', error);
    throw error;
  }
};

// ============================================================================
// Public Function: Get Track by URL
// Given a Spotify track URL, extract the track ID and fetch the track (adding it to DB).
export const getSpotifyTrackByUrl = async (db, uid, url) => {
  try {
    const trackId = parseSpotifyTrackUrl(url);
    if (!trackId) {
      throw new Error('Could not extract track ID from URL');
    }
    // Here you can choose whether to add the track to the DB or simply return it.
    // For example, we'll add it to the DB:
    return await getSpotifyTrackAndAddToDb(db, uid, trackId);
  } catch (error) {
    console.error('Error getting Spotify track by URL:', uid, url, error);
    throw error;
  }
};
