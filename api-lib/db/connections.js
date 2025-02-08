// api-lib/db/connections.js
import { ObjectId } from 'mongodb';

const COLLECTION_SPOTIFY_TOKENS = 'user_connections'; // changed to unify

/**
 * Saves (or updates) Spotify tokens in the `spotify_tokens` collection.
 */
export async function saveSpotifyTokens(db, { uid, access_token, refresh_token, expires_in }) {
  const tokensCollection = db.collection(COLLECTION_SPOTIFY_TOKENS);

  // Convert `expires_in` (seconds) into a precise future timestamp
  // Store it in a field named expires_at for clarity.
  const expires_at = Date.now() + expires_in * 1000;

  const filter = { service: 'spotify', uid };
  const update = {
    $set: {
      service: 'spotify',
      uid,
      access_token,
      refresh_token,
      expires_in,
      expires_at,
      updatedAt: new Date(),
    },
  };
  const options = { upsert: true };

  return tokensCollection.updateOne(filter, update, options);
}

/**
 * Retrieves the stored Spotify tokens for a given user.
 */
export async function findSpotifyTokens(db, uid) {
  console.log('finding tokens for', uid);
  const tokensCollection = db.collection(COLLECTION_SPOTIFY_TOKENS);
  return await tokensCollection.findOne({ service: 'spotify', uid });
}

/**
 * (Optional) If you need to store recently played, for reference:
 */
export async function saveRecentlyPlayedTracks(db, uid, tracks) {
  const COLLECTION_RECENTLY_PLAYED = 'recentlyPlayed';
  const recentlyPlayedCollection = db.collection(COLLECTION_RECENTLY_PLAYED);

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
