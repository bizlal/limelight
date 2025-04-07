import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'fs/promises'; // Use promises for better async handling
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = nc();

// Add CORS middleware
handler.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

handler.post(async (req, res) => {
  // Vercel-compatible temp directory
  const tmpDir = `${process.cwd()}/tmp`;
  await fs.promises.mkdir(tmpDir, { recursive: true });

  const form = new IncomingForm({
    uploadDir: tmpDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB (Vercel's limit)
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      // Validate files
      if (!files.coverArtFile?.[0] || !files.trackFile?.[0]) {
        return res
          .status(400)
          .json({ error: 'Missing cover art or track file' });
      }

      const [coverArtFile, trackFile] = [
        files.coverArtFile[0],
        files.trackFile[0],
      ];

      // Read files as streams (memory-efficient)
      const coverArtBuffer = await path.readFile(coverArtFile.filepath);
      const trackBuffer = await path.readFile(trackFile.filepath);

      // Build metadata from fields
      const metadata = {
        title: fields.title || 'Untitled Track',
        genre: fields.genre ? fields.genre : Genre.UNKNOWN,
        description: fields.description || '',
        mood: fields.mood ? fields.mood : Mood.UNKNOWN,
        releaseDate: fields.releaseDate
          ? new Date(fields.releaseDate)
          : new Date(),
        tags: fields.tags || '',
        remixOf: fields.remixOf ? JSON.parse(fields.remixOf) : undefined,
        aiAttributionUserId: fields.aiAttributionUserId || '',
        isStreamGated: fields.isStreamGated === 'true',
        streamConditions: fields.streamConditions
          ? JSON.parse(fields.streamConditions)
          : undefined,
        isDownloadGated: fields.isDownloadGated === 'true',
        downloadConditions: fields.downloadConditions
          ? JSON.parse(fields.downloadConditions)
          : undefined,
        isUnlisted: fields.isUnlisted === 'true',
        fieldVisibility: fields.fieldVisibility
          ? JSON.parse(fields.fieldVisibility)
          : undefined,
        isrc: fields.isrc || '',
        iswc: fields.iswc || '',
        license: fields.license || '',
      };

      // Upload to Audius
      const { trackId } = await audiusSdk.tracks.uploadTrack({
        userId: fields.userId?.[0] || 'defaultUserId',
        coverArtFile: {
          buffer: coverArtBuffer,
          name: 'coverArt',
        },
        trackFile: {
          buffer: trackBuffer,
          name: 'trackAudio',
        },
        metadata,
      });

      // Cleanup temp files
      await Promise.all([
        path.unlink(coverArtFile.filepath),
        path.unlink(trackFile.filepath),
      ]);

      return res.status(200).json({ trackId });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });
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
