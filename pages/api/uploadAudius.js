// pages/api/audius/uploadTrack.js
import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js built-in body parsing so formidable can handle it.
  },
};

const handler = nc();

handler.post(async (req, res) => {
  try {
    const coverArtBuffer = fs.readFileSync('path/to/cover-art.png');
    const trackBuffer = fs.readFileSync('path/to/track.mp3');

    const { trackId } = await audiusSdk.tracks.uploadTrack({
      userId: '7eP5n',
      coverArtFile: {
        buffer: Buffer.from(coverArtBuffer),
        name: 'coverArt',
      },
      metadata: {
        title: 'Monstera',
        genre: Genre.METAL,
        description: 'Dedicated to my favorite plant',
        mood: Mood.DEVOTIONAL,
        releaseDate: new Date('2022-09-30'),
        tags: 'plantlife,love,monstera',
        remixOf: { tracks: [{ parentTrackId: 'KVx2xpO' }] },
        aiAttributionUserId: '3aE1p',
        isStreamGated: true,
        streamConditions: {
          tipUserId: '7eP5n',
        },
        isDownloadGated: true,
        downloadConditions: {
          usdcPurchase: {
            price: 1,
            splits: {
              FwtT6g2tmwbgY6gf4NWBhupJBqJjgkaHRzCJpA1YHrL2: 10000,
            },
          },
        },
        isUnlisted: true,
        fieldVisibility: {
          mood: true,
          tags: true,
          genre: true,
          share: false,
          playCount: false,
          remixes: true,
        },
        isrc: 'USAT21812345',
        iswc: 'T-123.456.789-0',
        license: 'Attribution-NonCommercial-ShareAlike CC BY-NC-SA',
      },
      trackFile: {
        buffer: Buffer.from(trackBuffer),
        name: 'monsteraAudio',
      },
    });

    return res.status(200).json({ trackId });
  } catch (error) {
    console.error('Error uploading track:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to upload track' });
  }
});

// Add GET method to fetch moods
handler.get(async (req, res) => {
  const { type } = req.query;

  if (type === 'moods') {
    return res.status(200).json({ moods: Object.values(Mood) });
  }

  if (type === 'genres') {
    return res.status(200).json({ genres: Object.values(Genre) });
  }

  return res
    .status(400)
    .json({ error: 'Invalid type. Use "moods" or "genres".' });
});

export default handler;
