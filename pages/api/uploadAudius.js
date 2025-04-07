import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import pathModule from 'path';
import * as fsPromises from 'fs/promises';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';

// --- Helper functions ---
const validateTmpPath = (filepath) => {
  if (!filepath.startsWith('/tmp/')) {
    throw new Error('Invalid file path');
  }
  return filepath;
};

const validateEnum = (value, EnumType) => {
  return Object.values(EnumType).includes(value) ? value : EnumType.UNKNOWN;
};

const safeParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

export const config = { api: { bodyParser: false } };

const handler = nc();

handler.use((req, res, next) => {
  const allowedOrigins =
    process.env.NODE_ENV === 'production' ? ['https://www.lmlt.ai'] : ['*'];

  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(','));
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

handler.post(async (req, res) => {
  if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      if (!files.coverArtFile?.[0] || !files.trackFile?.[0]) {
        return res.status(400).json({ error: 'Missing required files' });
      }

      const [coverArt, track] = [files.coverArtFile[0], files.trackFile[0]];

      const { trackId } = await audiusSdk.tracks.uploadTrack({
        userId: fields.userId?.[0]?.toString(),
        coverArtFile: {
          stream: fs.createReadStream(validateTmpPath(coverArt.filepath)),
          name: pathModule.basename(coverArt.originalFilename || 'cover.jpg'),
          mimetype: coverArt.mimetype,
        },
        trackFile: {
          stream: fs.createReadStream(validateTmpPath(track.filepath)),
          name: pathModule.basename(track.originalFilename || 'track.mp3'),
          mimetype: track.mimetype,
        },
        metadata: {
          title: fields.title?.toString().substring(0, 100) || 'Untitled Track',
          genre: validateEnum(fields.genre, Genre),
          description: fields.description?.toString().substring(0, 500) || '',
          mood: validateEnum(fields.mood, Mood),
          releaseDate: fields.releaseDate
            ? new Date(fields.releaseDate)
            : new Date(),
          tags: fields.tags?.toString().substring(0, 200) || '',
          remixOf: fields.remixOf ? safeParse(fields.remixOf) : undefined,
          aiAttributionUserId: fields.aiAttributionUserId?.toString(),
          isStreamGated: fields.isStreamGated === 'true',
          streamConditions: fields.streamConditions
            ? safeParse(fields.streamConditions)
            : undefined,
          isDownloadGated: fields.isDownloadGated === 'true',
          downloadConditions: fields.downloadConditions
            ? safeParse(fields.downloadConditions)
            : undefined,
          isUnlisted: fields.isUnlisted === 'true',
          fieldVisibility: fields.fieldVisibility
            ? safeParse(fields.fieldVisibility)
            : undefined,
          isrc: fields.isrc?.toString(),
          iswc: fields.iswc?.toString(),
          license: fields.license?.toString(),
        },
      });

      await Promise.all([
        fsPromises.unlink(coverArt.filepath).catch(console.warn),
        fsPromises.unlink(track.filepath).catch(console.warn),
      ]);

      return res.status(200).json({ trackId });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Upload failed. Please try again.',
      });
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
