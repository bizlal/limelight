import { getSpotifyTrackByUrl } from './spotifyClient';
import { getMongoDb } from '@/api-lib/mongodb';

async function handleTrackUrl(url, uid) {
  const db = await getMongoDb();
  try {
    const track = await getSpotifyTrackByUrl(db, uid, url);
    console.log('Track object:', track);
  } catch (error) {
    console.error('Failed to fetch track:', error);
  }
}

// Example usage:
handleTrackUrl(
  'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  'someUserId'
);
