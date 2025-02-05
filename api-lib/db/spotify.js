// /api-lib/db/spotifyPlaylist.js

import axios from "axios";
import { findSpotifyTokens, saveSpotifyTokens } from "./connections.js";

/**
 * Returns the user's Spotify profile.
 * We need this to get the Spotify user ID (so we can create a playlist for them).
 */
async function getSpotifyProfile(accessToken) {
  const response = await axios.get("https://api.spotify.com/v1/me", {
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
      name: "Discovered on Limelight",
      description: "A special playlist curated by Limelight",
      public: false,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
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
    .collection("spotifyTokens")
    .updateOne(
      { service: "spotify", uid },
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
        "Content-Type": "application/json",
      },
    }
  );
}
