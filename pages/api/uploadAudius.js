import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import pathModule from 'path';
import * as fsPromises from 'fs/promises';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';
import fetch from 'node-fetch';

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
    : undefined;
};

const safeParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav'],
};

const MAX_FILE_SIZES = {
  track: 50 * 1024 * 1024, // 50MB
  cover: 5 * 1024 * 1024, // 5MB
};

async function fetchRemoteFile(url, maxSize) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(`File size exceeds ${maxSize} bytes`);
  }

  const buffer = await response.buffer();
  if (buffer.length > maxSize) {
    throw new Error(`File size exceeds ${maxSize} bytes`);
  }

  return {
    buffer,
    mimetype:
      response.headers.get('content-type') || 'application/octet-stream',
    filename: pathModule.basename(new URL(url).pathname) || 'file',
  };
}

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
    maxFileSize: MAX_FILE_SIZES.track,
    allowEmptyFiles: true,
    minFileSize: 0,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    let coverArt, track;
    try {
      // Validate track source: do not allow both track URL and file simultaneously
      if (fields.trackUrl?.[0] && files.trackFile?.[0]) {
        if (files.trackFile[0].size > 0) {
          return res
            .status(400)
            .json({ error: 'Cannot provide both track file and URL' });
        }
      }

      // Process track file
      let trackFile;
      if (fields.trackUrl?.[0]) {
        // Use remote URL to fetch file
        const { buffer, mimetype, filename } = await fetchRemoteFile(
          fields.trackUrl[0],
          MAX_FILE_SIZES.track
        );
        trackFile = { buffer, name: filename, mimetype };
      } else if (files.trackFile?.[0]) {
        // Use uploaded file
        track = files.trackFile[0];
        if (track.size === 0) {
          return res.status(400).json({ error: 'Track file is empty' });
        }
        trackFile = {
          buffer: await fsPromises.readFile(validateTmpPath(track.filepath)),
          name: pathModule.basename(track.originalFilename || 'track.mp3'),
          mimetype: track.mimetype,
        };
      } else {
        return res.status(400).json({ error: 'Track file or URL is required' });
      }

      // Validate cover art source: do not allow both cover URL and file simultaneously
      if (fields.coverUrl?.[0] && files.coverArtFile?.[0]) {
        if (files.coverArtFile[0].size > 0) {
          return res
            .status(400)
            .json({ error: 'Cannot provide both cover file and URL' });
        }
      }

      // Process cover art file
      let coverArtFile;
      if (fields.coverUrl?.[0]) {
        const { buffer, mimetype, filename } = await fetchRemoteFile(
          fields.coverUrl[0],
          MAX_FILE_SIZES.cover
        );
        coverArtFile = { buffer, name: filename, mimetype };
      } else if (files.coverArtFile?.[0]) {
        coverArt = files.coverArtFile[0];
        if (coverArt.size === 0) {
          return res.status(400).json({ error: 'Cover art file is empty' });
        }
        coverArtFile = {
          buffer: await fsPromises.readFile(validateTmpPath(coverArt.filepath)),
          name: pathModule.basename(coverArt.originalFilename || 'cover.jpg'),
          mimetype: coverArt.mimetype,
        };
      }

      // Validate MIME types for files
      if (trackFile && !ALLOWED_MIME_TYPES.audio.includes(trackFile.mimetype)) {
        return res.status(400).json({ error: 'Invalid audio format' });
      }

      if (
        coverArtFile &&
        !ALLOWED_MIME_TYPES.image.includes(coverArtFile.mimetype)
      ) {
        return res.status(400).json({ error: 'Invalid cover art format' });
      }

      // Build metadata, converting genre and mood to enums.
      const metadata = {
        title:
          fields.title?.toString().trim().substring(0, 100) || 'Untitled Track',
        genre: Genre.HIP_HOP_RAP,
        mood: Mood.AGGRESSIVE,
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

      // Debug: log inputs before upload
      console.log('Inputs for uploadTrack:', {
        userId: fields.userId[0].toString(),
        trackFile,
        coverArtFile,
        metadata,
      });

      // Upload to Audius using file objects directly.
      // Destructure the response to get trackId, blockHash, and blockNumber.
      const { trackId, blockHash, blockNumber } =
        await audiusSdk.tracks.uploadTrack({
          userId: fields.userId[0].toString(),
          trackFile: trackFile,
          coverArtFile: coverArtFile ? coverArtFile : undefined,
          metadata,
        });

      // Cleanup temporary files
      await Promise.all([
        coverArt?.filepath &&
          fsPromises.unlink(coverArt.filepath).catch(() => {}),
        track?.filepath && fsPromises.unlink(track.filepath).catch(() => {}),
      ]);

      return res.status(200).json({ trackId, blockHash, blockNumber });
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

// GET method: moods and genres retrieval
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
