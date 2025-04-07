import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import pathModule from 'path';
import * as fsPromises from 'fs/promises';
import { Blob } from 'blob-polyfill';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';

// Add Blob polyfill for Node.js
global.Blob = Blob;

// --- Helper functions ---
const validateTmpPath = (filepath) => {
  if (!filepath.startsWith('/tmp/')) {
    throw new Error('Invalid file path');
  }
  return filepath;
};

const validateEnum = (value, EnumType) => {
  const values = Object.values(EnumType);
  return typeof value === 'string' && values.includes(value)
    ? value
    : EnumType.UNKNOWN;
};

const safeParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav'],
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

    let coverArt, track;
    try {
      // Validate required track file
      if (!files.trackFile?.[0]) {
        return res.status(400).json({ error: 'Track file is required' });
      }

      track = files.trackFile[0];
      coverArt = files.coverArtFile?.[0];

      // Validate MIME types
      if (coverArt && !ALLOWED_MIME_TYPES.image.includes(coverArt.mimetype)) {
        return res.status(400).json({ error: 'Invalid cover art format' });
      }

      if (!ALLOWED_MIME_TYPES.audio.includes(track.mimetype)) {
        return res.status(400).json({ error: 'Invalid audio format' });
      }

      // Read files as buffers
      const [coverArtBuffer, trackBuffer] = await Promise.all([
        coverArt
          ? fsPromises.readFile(validateTmpPath(coverArt.filepath))
          : null,
        fsPromises.readFile(validateTmpPath(track.filepath)),
      ]);

      // Prepare files for SDK
      const trackFile = {
        buffer: trackBuffer,
        name: pathModule.basename(track.originalFilename || 'track.mp3'),
        mimetype: track.mimetype,
      };

      const coverArtFile = coverArtBuffer
        ? {
            buffer: coverArtBuffer,
            name: pathModule.basename(coverArt.originalFilename || 'cover.jpg'),
            mimetype: coverArt.mimetype,
          }
        : undefined;

      // Build metadata with validation
      const metadata = {
        title:
          fields.title?.toString().trim().substring(0, 100) || 'Untitled Track',
        genre: validateEnum(fields.genre, Genre),
        mood: validateEnum(fields.mood, Mood),
        description:
          fields.description?.toString().trim().substring(0, 500) || '',
        releaseDate: fields.releaseDate
          ? new Date(fields.releaseDate)
          : new Date(),
        tags: fields.tags?.toString().trim().substring(0, 200) || '',
        remixOf: fields.remixOf ? safeParse(fields.remixOf) : undefined,
        aiAttributionUserId: fields.aiAttributionUserId?.toString().trim(),
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
        isrc: fields.isrc?.toString().trim(),
        iswc: fields.iswc?.toString().trim(),
        license: fields.license?.toString().trim(),
      };

      // Upload to Audius
      const { trackId } = await audiusSdk.tracks.uploadTrack({
        userId: fields.userId[0].toString(),
        trackFile: new Blob([trackFile.buffer], { type: trackFile.mimetype }),
        coverArtFile: coverArtFile
          ? new Blob([coverArtFile.buffer], { type: coverArtFile.mimetype })
          : undefined,
        metadata,
      });

      // Cleanup files
      await Promise.all([
        coverArt?.filepath &&
          fsPromises.unlink(coverArt.filepath).catch(() => {}),
        fsPromises.unlink(track.filepath).catch(() => {}),
      ]);

      return res.status(200).json({ trackId });
    } catch (error) {
      // Cleanup files on error
      await Promise.all([
        coverArt?.filepath &&
          fsPromises.unlink(coverArt.filepath).catch(() => {}),
        track?.filepath && fsPromises.unlink(track.filepath).catch(() => {}),
      ]);

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

// GET method to fetch moods and genres
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
