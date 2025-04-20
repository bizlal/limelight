// Import MongoDB client and ObjectId
import { MongoClient, ObjectId } from 'mongodb';
// Assuming you have a utility function to connect to MongoDB
// e.g., in '@/lib/mongodb' or similar
import { connectToDatabase } from '@/lib/mongodb'; // Adjust path as needed

import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import pathModule from 'path';
import * as fsPromises from 'fs/promises';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';
import fetch from 'node-fetch';

// --- Helper functions --- (Keep existing helpers: validateTmpPath, safeParse, ALLOWED_MIME_TYPES, MAX_FILE_SIZES, fetchRemoteFile)
const validateTmpPath = (filepath) => {
  // ... (implementation unchanged)
  if (!filepath.startsWith('/tmp/')) {
    throw new Error('Invalid file path');
  }
  return filepath;
};

const safeParse = (str) => {
  // ... (implementation unchanged)
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

const ALLOWED_MIME_TYPES = {
  // ... (definition unchanged)
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav'],
};

const MAX_FILE_SIZES = {
  // ... (definition unchanged)
  track: 50 * 1024 * 1024, // 50MB
  cover: 5 * 1024 * 1024, // 5MB
};

async function fetchRemoteFile(url, maxSize) {
  // ... (implementation unchanged)
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
// --- End Helper functions ---

export const config = { api: { bodyParser: false } };

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('Handler Error:', err.stack);
    res.status(500).json({ error: `Something broke! ${err.message}` });
  },
  onNoMatch: (req, res) => {
    res.status(404).json({ error: `Method ${req.method} Not Allowed` });
  },
});

// Middleware for Database Connection (Example)
handler.use(async (req, res, next) => {
  try {
    // Attach the database connection to the request object
    const { db } = await connectToDatabase(); // Your connection function
    req.db = db;
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Failed to connect to database' });
  }
});

// CORS Middleware
handler.use((req, res, next) => {
  // ... (CORS headers setup unchanged)
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

  // Ensure db connection exists from middleware
  if (!req.db) {
    console.error('Database connection not found in request object');
    return res
      .status(500)
      .json({ error: 'Internal Server Error: DB connection missing' });
  }
  const db = req.db; // Get db instance from request

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

    let coverArt, track; // Hold formidable file objects for cleanup
    let mongoTrackId = new ObjectId(); // Generate MongoDB ObjectId

    try {
      // --- File Processing and Validation (Largely Unchanged) ---

      // Validate track source
      if (fields.trackUrl?.[0] && files.trackFile?.[0]?.size > 0) {
        return res
          .status(400)
          .json({ error: 'Cannot provide both track file and URL' });
      }

      // Process track file
      let trackFile;
      let originalTrackUrl = fields.trackUrl?.[0] || null;
      let trackFileSize = 0;
      if (originalTrackUrl) {
        const fetchedFile = await fetchRemoteFile(
          originalTrackUrl,
          MAX_FILE_SIZES.track
        );
        trackFile = {
          buffer: fetchedFile.buffer,
          name: fetchedFile.filename,
          mimetype: fetchedFile.mimetype,
        };
        trackFileSize = fetchedFile.buffer.length;
      } else if (files.trackFile?.[0]) {
        track = files.trackFile[0];
        if (track.size === 0) {
          return res.status(400).json({ error: 'Track file is empty' });
        }
        trackFile = {
          buffer: await fsPromises.readFile(validateTmpPath(track.filepath)),
          name: pathModule.basename(track.originalFilename || 'track.mp3'),
          mimetype: track.mimetype,
        };
        trackFileSize = track.size;
      } else {
        return res.status(400).json({ error: 'Track file or URL is required' });
      }

      // Validate cover art source
      if (fields.coverUrl?.[0] && files.coverArtFile?.[0]?.size > 0) {
        return res
          .status(400)
          .json({ error: 'Cannot provide both cover file and URL' });
      }

      // Process cover art file
      let coverArtFile;
      let originalCoverUrl = fields.coverUrl?.[0] || null;
      if (originalCoverUrl) {
        const fetchedCover = await fetchRemoteFile(
          originalCoverUrl,
          MAX_FILE_SIZES.cover
        );
        coverArtFile = {
          buffer: fetchedCover.buffer,
          name: fetchedCover.filename,
          mimetype: fetchedCover.mimetype,
        };
      } else if (files.coverArtFile?.[0]) {
        coverArt = files.coverArtFile[0];
        if (coverArt.size === 0) {
          // Allow empty cover art file if coverUrl is not provided either
          if (!originalCoverUrl) coverArtFile = undefined;
          else
            return res.status(400).json({ error: 'Cover art file is empty' });
        } else {
          coverArtFile = {
            buffer: await fsPromises.readFile(
              validateTmpPath(coverArt.filepath)
            ),
            name: pathModule.basename(coverArt.originalFilename || 'cover.jpg'),
            mimetype: coverArt.mimetype,
          };
        }
      }
      // else coverArtFile remains undefined - no cover art provided

      // Validate MIME types
      if (trackFile && !ALLOWED_MIME_TYPES.audio.includes(trackFile.mimetype)) {
        return res.status(400).json({ error: 'Invalid audio format' });
      }
      if (
        coverArtFile &&
        !ALLOWED_MIME_TYPES.image.includes(coverArtFile.mimetype)
      ) {
        return res.status(400).json({ error: 'Invalid cover art format' });
      }

      // --- Audius Upload ---

      // Build Audius metadata (ensure Genre/Mood are mapped correctly if needed later for DB)
      const audiusGenre = fields.genre?.[0]
        ? Genre[fields.genre[0].toUpperCase().replace(/ /g, '_')] || Genre.ALL
        : Genre.ALL; // Example mapping
      const audiusMood = fields.mood?.[0]
        ? Mood[fields.mood[0].toUpperCase()] || Mood.UPBEAT
        : Mood.UPBEAT; // Example mapping
      const releaseDate = fields.releaseDate?.[0]
        ? new Date(fields.releaseDate[0])
        : new Date();

      const metadata = {
        title:
          fields.title?.[0]?.toString().trim().substring(0, 100) ||
          'Untitled Track',
        genre: audiusGenre, // Use Audius SDK Enum
        mood: audiusMood, // Use Audius SDK Enum
        description:
          fields.description?.[0]?.toString().trim().substring(0, 500) || '',
        releaseDate: releaseDate,
        tags: fields.tags?.[0]?.toString().trim().substring(0, 200) || '',
        // Add other Audius metadata fields as needed from 'fields'
        // ... (remixOf, aiAttributionUserId, gating, etc.)
      };

      const userId = fields.userId?.[0]?.toString();
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      console.log('Preparing to upload to Audius...');
      const {
        trackId: audiusTrackId,
        blockHash,
        blockNumber,
      } = await audiusSdk.tracks.uploadTrack({
        userId: userId,
        trackFile: trackFile,
        coverArtFile: coverArtFile, // Pass undefined if no cover art
        metadata,
      });
      console.log(
        `Successfully uploaded to Audius. Track ID: ${audiusTrackId}`
      );

      // --- MongoDB Insertion ---

      console.log('Preparing to insert track into MongoDB...');

      // **IMPORTANT**: Construct the MongoDB document based on `test_tracks` schema
      // This structure is based on `createNewReleaseFinal`, adapt as needed.
      // We use the *original* URLs if provided, otherwise null.
      // Duration, bitrate, etc., might require additional processing not done here.
      const mongoTrackData = {
        _id: mongoTrackId,
        track_id: mongoTrackId.toString(), // Use MongoDB's ObjectId as the primary track_id for this collection
        audius_track_id: audiusTrackId, // Store the Audius track ID separately
        uid: userId, // The user who uploaded
        metadata: {
          // Map fields - use defaults if not provided
          // Note: You might need to fetch artist name based on userId
          artist: fields.artistName?.[0] || 'Unknown Artist', // Assuming artistName field exists or fetch it
          track_title: metadata.title,
          album_title: metadata.title, // Assuming single for now
          release_date: metadata.releaseDate.getTime(), // Store as timestamp
          cover_art: originalCoverUrl, // Use original URL if provided
          primary_genre: fields.genre?.[0] || 'Unknown', // Use the *string* genre from form
          secondary_genre: fields.genre?.[0] || 'Unknown',
          // Fields often requiring audio analysis (set defaults)
          duration: fields.duration?.[0] ? parseInt(fields.duration[0]) : 0, // Example: Expect duration in form
          bitrate: 0,
          bpm: 0,
          // Other fields from createNewReleaseFinal (set defaults or omit)
          featured_artists: [],
          writing_credits: [],
          producing_credits: [],
          language: 'English',
          description: metadata.description,
          release_type: 'Single',
          isrc: fields.isrc?.[0] || '',
          iswc: fields.iswc?.[0] || '',
        },
        is_active: true, // Default
        release_metrics: {
          // Initialize metrics
          total_likes: 0,
          total_dislikes: 0,
          total_streams: 0,
          total_skips: 0,
          total_replays: 0,
          total_unique_listeners: 0,
          total_impressions: 0,
          dsp_clicks: { spotify: 0, apple_music: 0 },
          total_outreach: 0,
          total_shares: 0,
          total_comments: 0,
          total_reposts: 0,
          total_saves: 0,
        },
        tags: metadata.tags
          ? metadata.tags.split(',').map((tag) => tag.trim())
          : [],
        is_instrumental: fields.isInstrumental?.[0] === 'true' || false,
        is_explicit: fields.isExplicit?.[0] === 'true' || false,
        mood: fields.mood?.[0] || '', // Use string mood from form
        image_url: originalCoverUrl, // Use original URL if provided
        audio_url: originalTrackUrl, // Use original URL if provided
        video_url: fields.videoUrl?.[0] || null, // Add if you have video URL field
        dsp_links: {
          // Add if you have these fields
          spotify: fields.spotifyUrl?.[0] || null,
          apple_music: fields.appleMusicUrl?.[0] || null,
        },
        file_size: trackFileSize, // Store the file size
        // Location data (add if available from form fields)
        // release_location: { ... },
        // mongodb_location: { ... },
        genre: fields.genre?.[0] || 'Unknown', // Store string genre
        // Add other fields as per your `test_tracks` schema
        // autotags: [], beat_drop: 0, tempo: 0, clip_start_time: 0, nft: {...}
        date_created: new Date(), // Add creation timestamp for the DB record
      };

      const insertResult = await db
        .collection('test_tracks')
        .insertOne(mongoTrackData);
      console.log(
        `Successfully inserted track into MongoDB. Inserted ID: ${insertResult.insertedId}`
      );

      // --- Cleanup ---
      await Promise.all([
        coverArt?.filepath &&
          fsPromises
            .unlink(validateTmpPath(coverArt.filepath))
            .catch(console.error),
        track?.filepath &&
          fsPromises
            .unlink(validateTmpPath(track.filepath))
            .catch(console.error),
      ]);

      // --- Success Response ---
      return res.status(200).json({
        audiusTrackId: audiusTrackId, // Keep Audius ID
        mongoTrackId: insertResult.insertedId.toString(), // Return the new MongoDB ID
        blockHash,
        blockNumber,
        message: 'Track uploaded to Audius and saved to database successfully.',
      });
    } catch (error) {
      // --- Error Handling & Cleanup ---
      console.error('Upload or DB Insert error:', error);

      // Attempt cleanup even on error
      await Promise.all([
        coverArt?.filepath &&
          fsPromises
            .unlink(validateTmpPath(coverArt.filepath))
            .catch(console.error),
        track?.filepath &&
          fsPromises
            .unlink(validateTmpPath(track.filepath))
            .catch(console.error),
      ]);

      // Determine appropriate status code based on error type if possible
      let statusCode = 500;
      if (
        error.message.includes('exceeds') ||
        error.message.includes('Invalid')
      ) {
        statusCode = 400; // Bad request for size/format errors
      } else if (
        error.message.includes('Audius') ||
        error.message.includes('uploadTrack')
      ) {
        statusCode = 502; // Bad Gateway if Audius upload failed
      } else if (
        error.message.includes('MongoDB') ||
        error.message.includes('insertOne')
      ) {
        statusCode = 500; // Internal error for DB issues
      }

      return res.status(statusCode).json({
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Upload failed. Please check inputs or try again.',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });
});

// GET method: moods and genres retrieval (Unchanged)
handler.get(async (req, res) => {
  // ... (GET handler implementation unchanged)
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
