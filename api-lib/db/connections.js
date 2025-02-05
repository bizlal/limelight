// connections.js
import { ObjectId } from 'mongodb';

// Define collection names as constants for maintainability.
export const COLLECTION_SPOTIFY_TOKENS = 'spotifyTokens';
export const COLLECTION_RECENTLY_PLAYED = 'recentlyPlayed';

/**
 * Saves (or updates) Spotify tokens in the `COLLECTION_SPOTIFY_TOKENS` collection.
 *
 * @param {import('mongodb').Db} db - The connected database instance.
 * @param {Object} tokens
 * @param {string} tokens.uid - The user's id.
 * @param {string} tokens.access_token - The access token from Spotify.
 * @param {string} tokens.refresh_token - The refresh token from Spotify.
 * @param {number} tokens.expires_in - The lifetime of the access token in seconds.
 * @returns {Promise<import('mongodb').UpdateResult>}
 */
export async function saveSpotifyTokens(
  db,
  { uid, access_token, refresh_token, expires_in }
) {
  const tokensCollection = db.collection(COLLECTION_SPOTIFY_TOKENS);

  // Filter by service and uid so each user can have their own token.
  const filter = { service: 'spotify', uid };
  const update = {
    $set: {
      uid,
      access_token,
      refresh_token,
      expires_in,
      updatedAt: new Date(),
    },
  };
  const options = { upsert: true };

  return tokensCollection.updateOne(filter, update, options);
}

/**
 * Retrieves the stored Spotify tokens for a given user.
 *
 * @param {import('mongodb').Db} db - The connected database instance.
 * @param {string} uid - The user's id.
 * @returns {Promise<Object|null>} The stored tokens document or null if not found.
 */
export async function findSpotifyTokens(db, uid) {
  const tokensCollection = db.collection(COLLECTION_SPOTIFY_TOKENS);
  return tokensCollection.findOne({ service: 'spotify', uid });
}

/**
 * Saves (or updates) recently played tracks in the `COLLECTION_RECENTLY_PLAYED` collection.
 * Each track is upserted based on the user's id and the track's played_at timestamp.
 *
 * @param {import('mongodb').Db} db - The connected database instance.
 * @param {string} uid - The user's id.
 * @param {Array} tracks - An array of track items from Spotify. Each item should have
 *                           a `played_at` timestamp and a `track` object.
 * @returns {Promise<import('mongodb').BulkWriteResult|null>}
 */
export async function saveRecentlyPlayedTracks(db, uid, tracks) {
  const recentlyPlayedCollection = db.collection(COLLECTION_RECENTLY_PLAYED);

  // Prepare bulk operations for each track entry.
  const operations = tracks.map((item) => {
    const { played_at, track } = item;
    return {
      updateOne: {
        filter: { uid, played_at },
        update: { $set: { uid, played_at, track, updatedAt: new Date() } },
        upsert: true,
      },
    };
  });

  if (operations.length === 0) {
    return null;
  }

  return recentlyPlayedCollection.bulkWrite(operations);
}
