// api-lib/db/discover.js

/**
 * Saves an array of discovered tracks to the database.
 * Each track is upserted based on its unique id.
 */
export async function saveDiscoveredTracks(db, tracks) {
    const collection = db.collection('discover_tracks');
    const bulkOps = tracks.map((track) => ({
      updateOne: {
        filter: { id: track.id },
        update: { $set: track },
        upsert: true,
      },
    }));
    const result = await collection.bulkWrite(bulkOps);
    return result;
  }
  
  /**
   * Retrieves discovered tracks from the database.
   * You can specify a limit (default is 20).
   */
  export async function getDiscoveredTracks(db, limit = 20) {
    const collection = db.collection('discover_tracks');
    const tracks = await collection.find().limit(limit).toArray();
    return tracks;
  }
  