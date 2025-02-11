// pages/api/share-track.js
import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { getSpotifyTrackByUrl, getToken } from '@/api-lib/db'; // rename to match your actual file
import { addTracksToDiscoveredPlaylist } from '@/api-lib/db/spotifyPlaylist';

const handler = nc();

handler.post(async (req, res) => {
  try {
    const { uid, url } = req.body;
    if (!uid || !url) {
      return res
        .status(400)
        .json({ error: 'Missing uid or url in request body.' });
    }

    // Connect to MongoDB
    const db = await getMongoDb();

    // 1) Get the Spotify track data and add it to your DB
    const track = await getSpotifyTrackByUrl(db, uid, url);

    // 2) Extract the Spotify track ID from the returned track object
    const spotifyTrackId = track.spotify_obj?.id;
    if (!spotifyTrackId) {
      return res
        .status(400)
        .json({ error: 'Could not determine Spotify track ID.' });
    }
    console.log(db, uid, spotifyTrackId);
    // 3) Get the current (or refreshed) Spotify access token for the user
    const { accessToken } = await getToken(db, uid);
    if (!accessToken) {
      return res
        .status(401)
        .json({ error: 'No valid Spotify access token available.' });
    }
    if (!uid) {
      console.error('No user ID found');
      return res.status(400).json({ error: 'Missing uid parameter.' });
    }

    // 4) Build the Spotify track URI
    const trackUri = `spotify:track:${spotifyTrackId}`;

    // 5) Add the track URI to the user's "Discovered on Limelight" playlist
    await addTracksToDiscoveredPlaylist(db, uid, accessToken, [trackUri]);

    return res
      .status(200)
      .json({ message: 'Track shared successfully.', track });
  } catch (error) {
    console.error(
      'Error in share-track API:',
      uid,
      error.response?.data || error.message || error
    );
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error.' });
  }
});

export default handler;
