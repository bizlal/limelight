// pages/api/discover.js
import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { getDiscoveredTracks, saveDiscoveredTracks } from '@/api-lib/db';

const handler = nc();

/**
 * GET /api/discover
 *  - Retrieves discovered tracks from the database.
 *  - Optionally, you could extend this endpoint to call an external API
 *    (e.g. Spotify, Apple Music, etc.) if no tracks are found.
 */
handler.get(async (req, res) => {
  try {
    const db = await getMongoDb();
    let tracks = await getDiscoveredTracks(db);
    // If no tracks are stored, you might want to trigger an external fetch here.
    // For this example, we return an empty array if none are found.
    if (!tracks || tracks.length === 0) {
      tracks = [];
    }
    res.status(200).json({ tracks });
  } catch (error) {
    console.error('GET /api/discover error:', error);

    res.status(500).json({ error: error.message });
  }
});

export default handler;
