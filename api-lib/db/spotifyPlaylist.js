// api-lib/db/spotifyPlaylist.js
import axios from 'axios';
import { findSpotifyTokens, saveSpotifyTokens } from './connections.js';

/**
 * Returns the user's Spotify profile.
 * We need this to get the Spotify user ID (so we can create a playlist).
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
 */
export async function createOrGetDiscoveredPlaylist(db, uid, accessToken) {
  // First, see if we already have a playlist ID saved in the tokens doc.
  const tokensDoc = await findSpotifyTokens(db, uid);
  if (!tokensDoc) {
    throw new Error(`No tokens found for user ${uid}. Cannot create playlist.`);
  }

  // Already have a discovered playlist ID?
  if (tokensDoc.discovered_playlist_id) {
    return tokensDoc.discovered_playlist_id;
  }

  // Otherwise, create a new playlist on Spotify
  const userProfile = await getSpotifyProfile(accessToken);
  const spotifyUserId = userProfile.id;

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

  // Persist that playlist ID
  await db
    .collection('spotify_tokens')
    .updateOne(
      { service: 'spotify', uid },
      { $set: { discovered_playlist_id: playlistId } }
    );

  // Keep your existing token logic up to date if needed
  // Just rewriting the same token doc to ensure consistency:
  await saveSpotifyTokens(db, {
    uid,
    access_token: tokensDoc.access_token,
    refresh_token: tokensDoc.refresh_token,
    expires_in: tokensDoc.expires_in,
  });

  return playlistId;
}

/**
 * Adds track URIs to the user's "Discovered on Limelight" playlist.
 */
export async function addTracksToDiscoveredPlaylist(
  db,
  uid,
  accessToken,
  trackUris
) {
  if (!Array.isArray(trackUris) || trackUris.length === 0) {
    return;
  }

  // 1) Ensure we have a valid discoveredPlaylistId
  const discoveredPlaylistId = await createOrGetDiscoveredPlaylist(
    db,
    uid,
    accessToken
  );

  // 2) POST the URIs to /playlists/{playlist_id}/tracks
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
