// Import MongoDB client and ObjectId
import { ObjectId } from 'mongodb';
// Import the function to get the MongoDB connection
import { getMongoDb } from '@/api-lib/mongodb'; // Adjust path as needed

import nc from 'next-connect';
import { IncomingForm } from 'formidable';
import pathModule from 'path';
import * as fsPromises from 'fs/promises';
import { Mood, Genre } from '@audius/sdk';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK'; // Adjust path as needed
import fetch from 'node-fetch';

// --- Helper functions --- (Keep existing helpers: validateTmpPath, ALLOWED_MIME_TYPES, MAX_FILE_SIZES, fetchRemoteFile)
const validateTmpPath = (filepath) => {
  // Simple validation: ensure path starts with /tmp/
  // Add more robust checks if needed (e.g., prevent directory traversal)
  if (!filepath || !filepath.startsWith('/tmp/')) {
    console.error('Invalid temporary file path:', filepath);
    throw new Error('Invalid file path');
  }
  // Ensure it doesn't contain '..' to prevent traversal
  if (filepath.includes('..')) {
    console.error('Directory traversal attempt detected:', filepath);
    throw new Error('Invalid file path characters');
  }
  return filepath;
};

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], // Added gif
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
  ], // Added common types
};

const MAX_FILE_SIZES = {
  track: 50 * 1024 * 1024, // 50MB
  cover: 5 * 1024 * 1024, // 5MB
};

async function fetchRemoteFile(url, maxSize) {
  console.log(`Fetching remote file: ${url}`);
  const response = await fetch(url, {
    // Add timeout? Add user-agent?
    headers: { 'User-Agent': 'Limelight-API-Fetcher/1.0' }, // Example User-Agent
  });

  if (!response.ok) {
    console.error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const contentType =
    response.headers.get('content-type') || 'application/octet-stream';
  const contentLength = response.headers.get('content-length');
  console.log(
    `Content-Type: ${contentType}, Content-Length: ${
      contentLength || 'unknown'
    }`
  );

  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    console.error(
      `File size (${contentLength}) exceeds max size (${maxSize}) for URL: ${url}`
    );
    throw new Error(
      `File size exceeds limit (${(maxSize / (1024 * 1024)).toFixed(1)}MB)`
    );
  }

  // Read buffer in chunks to prevent large memory allocation at once?
  // For now, buffer() is simpler but could be optimized for very large files.
  const buffer = await response.buffer();

  // Double check buffer size after download, as Content-Length might be missing/wrong
  if (buffer.length > maxSize) {
    console.error(
      `Downloaded file size (${buffer.length}) exceeds max size (${maxSize}) for URL: ${url}`
    );
    throw new Error(
      `File size exceeds limit (${(maxSize / (1024 * 1024)).toFixed(1)}MB)`
    );
  }
  console.log(`Successfully fetched ${url}, size: ${buffer.length} bytes`);

  return {
    buffer,
    mimetype: contentType,
    // Try to get a reasonable filename
    filename:
      pathModule.basename(new URL(url).pathname) || `remote_file_${Date.now()}`,
  };
}
// --- End Helper functions ---

// Disable Next.js body parsing, as formidable handles it
export const config = { api: { bodyParser: false } };

// Initialize next-connect handler
const handler = nc({
  onError: (err, req, res) => {
    // Centralized error logging
    console.error('API Handler Error:', err.stack || err);
    res.status(err.statusCode || 500).json({
      error: 'An unexpected error occurred.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  },
  onNoMatch: (req, res) => {
    res.status(405).json({ error: `Method ${req.method} Not Allowed` }); // Use 405 for Method Not Allowed
  },
});

// --- Middleware ---

// CORS Middleware (Adjust origins as needed)
handler.use((req, res, next) => {
  // Define allowed origins based on environment
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://www.lmlt.ai', 'https://lmlt.ai'] // Add both www and non-www if applicable
      : ['http://localhost:3000', 'http://127.0.0.1:3000']; // Allow local dev

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    // Allow requests with no origin (like Postman) in dev
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  // Or be stricter: else if (origin) { console.warn(`Origin ${origin} not allowed.`); }

  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); // Add OPTIONS for preflight
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Add Authorization if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // If using credentials/cookies

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// --- Removed Database Connection Middleware ---
// The database connection will now be established directly inside the handler method.

// --- POST Handler ---
handler.post(async (req, res) => {
  // Check content type early
  if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
    console.warn('Unsupported media type:', req.headers['content-type']);
    return res
      .status(415)
      .json({ error: 'Unsupported media type. Use multipart/form-data.' });
  }

  // Initialize formidable
  const form = new IncomingForm({
    uploadDir: '/tmp', // Ensure this directory exists and is writable
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZES.track, // Set max size for the entire request? Formidable might apply per file. Check docs.
    allowEmptyFiles: false, // Disallow totally empty files unless specifically needed
    minFileSize: 1, // Require at least 1 byte
    // Consider adding maxFiles, maxFields, maxFieldsSize limits
  });

  // Wrap form parsing in a Promise to use async/await
  const parseForm = () =>
    new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err);
          // Provide more specific error messages if possible
          if (err.code === 'LIMIT_FILE_SIZE') {
            return reject({
              statusCode: 413,
              message: `File exceeds size limit (${(
                MAX_FILE_SIZES.track /
                (1024 * 1024)
              ).toFixed(1)}MB)`,
            }); // 413 Payload Too Large
          }
          return reject({
            statusCode: 400,
            message: 'Failed to parse form data.',
          }); // 400 Bad Request
        }
        resolve({ fields, files });
      });
    });

  let coverArtFormidable, trackFormidable; // Hold formidable file objects for cleanup path access
  let mongoTrackId = new ObjectId(); // Generate MongoDB ObjectId beforehand

  try {
    // Parse form data
    const { fields, files } = await parseForm();

    // --- File Processing and Validation ---
    console.log('Received fields:', Object.keys(fields));
    console.log('Received files:', Object.keys(files));

    // Get track source (URL or File)
    const originalTrackUrl = fields.trackUrl?.[0]?.toString().trim() || null;
    trackFormidable = files.trackFile?.[0]; // Keep formidable file object

    if (originalTrackUrl && trackFormidable) {
      throw {
        statusCode: 400,
        message: 'Cannot provide both track file and URL.',
      };
    }

    let trackFileSource; // Will contain { buffer, name, mimetype }
    let trackFileSize = 0;

    if (originalTrackUrl) {
      console.log(`Processing track from URL: ${originalTrackUrl}`);
      const fetchedFile = await fetchRemoteFile(
        originalTrackUrl,
        MAX_FILE_SIZES.track
      );
      trackFileSource = {
        buffer: fetchedFile.buffer,
        name: fetchedFile.filename,
        mimetype: fetchedFile.mimetype,
      };
      trackFileSize = fetchedFile.buffer.length;
    } else if (trackFormidable) {
      console.log(
        `Processing uploaded track file: ${trackFormidable.originalFilename}`
      );
      if (trackFormidable.size < 1) {
        throw { statusCode: 400, message: 'Track file cannot be empty.' };
      }
      trackFileSource = {
        buffer: await fsPromises.readFile(
          validateTmpPath(trackFormidable.filepath)
        ),
        name: pathModule.basename(
          trackFormidable.originalFilename || `track-${Date.now()}.tmp`
        ), // Use basename
        mimetype: trackFormidable.mimetype,
      };
      trackFileSize = trackFormidable.size;
    } else {
      throw {
        statusCode: 400,
        message: 'Track file or track URL is required.',
      };
    }

    // Validate track MIME type
    if (!ALLOWED_MIME_TYPES.audio.includes(trackFileSource.mimetype)) {
      throw {
        statusCode: 400,
        message: `Invalid audio format: ${
          trackFileSource.mimetype
        }. Allowed: ${ALLOWED_MIME_TYPES.audio.join(', ')}`,
      };
    }
    console.log(
      `Track processed. Size: ${trackFileSize}, Type: ${trackFileSource.mimetype}`
    );

    // Get cover art source (URL or File) - Optional
    const originalCoverUrl = fields.coverUrl?.[0]?.toString().trim() || null;
    coverArtFormidable = files.coverArtFile?.[0]; // Keep formidable file object

    if (originalCoverUrl && coverArtFormidable) {
      throw {
        statusCode: 400,
        message: 'Cannot provide both cover art file and URL.',
      };
    }

    let coverArtFileSource = undefined; // Default to undefined (no cover art)

    if (originalCoverUrl) {
      console.log(`Processing cover art from URL: ${originalCoverUrl}`);
      const fetchedCover = await fetchRemoteFile(
        originalCoverUrl,
        MAX_FILE_SIZES.cover
      );
      coverArtFileSource = {
        buffer: fetchedCover.buffer,
        name: fetchedCover.filename,
        mimetype: fetchedCover.mimetype,
      };
    } else if (coverArtFormidable) {
      console.log(
        `Processing uploaded cover art file: ${coverArtFormidable.originalFilename}`
      );
      if (coverArtFormidable.size < 1) {
        // If file exists but is empty, treat as no cover art provided
        console.warn('Empty cover art file uploaded, ignoring.');
        coverArtFileSource = undefined;
      } else {
        coverArtFileSource = {
          buffer: await fsPromises.readFile(
            validateTmpPath(coverArtFormidable.filepath)
          ),
          name: pathModule.basename(
            coverArtFormidable.originalFilename || `cover-${Date.now()}.tmp`
          ), // Use basename
          mimetype: coverArtFormidable.mimetype,
        };
      }
    }
    // else: No cover URL and no cover file means coverArtFileSource remains undefined

    // Validate cover art MIME type if provided
    if (
      coverArtFileSource &&
      !ALLOWED_MIME_TYPES.image.includes(coverArtFileSource.mimetype)
    ) {
      throw {
        statusCode: 400,
        message: `Invalid cover art format: ${
          coverArtFileSource.mimetype
        }. Allowed: ${ALLOWED_MIME_TYPES.image.join(', ')}`,
      };
    }
    if (coverArtFileSource) {
      console.log(`Cover art processed. Type: ${coverArtFileSource.mimetype}`);
    } else {
      console.log('No cover art provided or processed.');
    }

    // --- Prepare Metadata ---
    const userId = fields.userId?.[0]?.toString(); // Get User ID (e.g., from authenticated session or field)
    if (!userId) {
      throw { statusCode: 400, message: 'User ID is required.' };
    }

    // Map form fields to Audius SDK Enums safely
    const getEnumKey = (enumObj, value) => {
      if (!value) return undefined;
      const upperValue = value.toUpperCase().replace(/ /g, '_');
      return enumObj[upperValue] ? upperValue : undefined; // Return key if valid
    };
    const audiusGenreKey = getEnumKey(Genre, fields.genre?.[0]);
    const audiusMoodKey = getEnumKey(Mood, fields.mood?.[0]);

    const releaseDateString = fields.releaseDate?.[0];
    let releaseDate = new Date(); // Default to now
    if (releaseDateString) {
      const parsedDate = new Date(releaseDateString);
      // Check if the parsed date is valid
      if (!isNaN(parsedDate.getTime())) {
        releaseDate = parsedDate;
      } else {
        console.warn(
          `Invalid release date format received: ${releaseDateString}. Defaulting to now.`
        );
      }
    }

    // Construct Audius metadata object
    const audiusMetadata = {
      title:
        fields.title?.[0]?.toString().trim().substring(0, 100) ||
        'Untitled Track',
      genre: audiusGenreKey ? Genre[audiusGenreKey] : Genre.ALL, // Use Enum value
      mood: audiusMoodKey ? Mood[audiusMoodKey] : Mood.DREAMY, // Use Enum value, default Dreamy
      description:
        fields.description?.[0]?.toString().trim().substring(0, 500) || '',
      releaseDate: releaseDate,
      tags: fields.tags?.[0]?.toString().trim().substring(0, 200) || '', // Comma-separated string for Audius
      // Add other optional Audius metadata fields if present in 'fields'
      isrc: fields.isrc?.[0] || undefined,
      iswc: fields.iswc?.[0] || undefined,
      license: fields.license?.[0] || undefined, // e.g. "All rights reserved"
      // Example: Add remix settings if provided
      // remixOf: fields.remixParentTrackId ? { tracks: [{ parent_track_id: fields.remixParentTrackId[0] }] } : undefined,
      // Example: Add premium/gating settings if provided
      // isPremium: fields.isPremium?.[0] === 'true',
      // premiumConditions: fields.isPremium?.[0] === 'true' ? { /* ... gating conditions ... */ } : undefined,
    };
    console.log('Audius Metadata prepared:', audiusMetadata);

    // --- Audius Upload ---
    console.log(`Uploading to Audius for user ID: ${userId}...`);
    const {
      trackId: audiusTrackId, // This is the Audius ID (numeric or CIDs)
      blockHash,
      blockNumber,
      // Potentially other response fields like transcodedMasterUrl, artworkUrl etc.
    } = await audiusSdk.tracks.uploadTrack({
      userId: userId, // Ensure this is the correct Audius User ID
      trackFile: trackFileSource,
      coverArtFile: coverArtFileSource, // Pass undefined if no cover art
      metadata: audiusMetadata,
      // onProgress: (progress) => { console.log(`Audius Upload Progress: ${progress}%`); } // Optional progress tracking
    });
    console.log(
      `Audius upload successful. Audius Track ID: ${audiusTrackId}, Block: ${blockNumber}`
    );

    // --- MongoDB Insertion ---
    console.log('Connecting to MongoDB...');
    // ** Get DB instance directly here **
    const db = await getMongoDb();
    console.log('MongoDB connected. Preparing document...');

    // Construct the document for the 'test_tracks' collection
    // Map fields carefully, using defaults where appropriate
    const mongoTrackData = {
      _id: mongoTrackId, // Use the pre-generated ObjectId
      track_id: mongoTrackId.toString(), // String version for convenience
      audius_track_id: audiusTrackId, // Store the ID returned by Audius SDK
      uid: userId, // User ID from form/session
      metadata: {
        artist: fields.artistName?.[0] || 'Unknown Artist', // Get artist name from form or user profile
        track_title: audiusMetadata.title,
        album_title: fields.albumTitle?.[0] || audiusMetadata.title, // Use track title if no album
        release_date: audiusMetadata.releaseDate.getTime(), // Store as Unix timestamp (milliseconds)
        cover_art: originalCoverUrl, // Store original URL if provided, otherwise null
        primary_genre: fields.genre?.[0]?.toString() || 'Unknown', // Store the raw string genre
        secondary_genre: fields.secondaryGenre?.[0]?.toString() || '', // Optional secondary genre
        duration: fields.duration?.[0] ? parseInt(fields.duration[0], 10) : 0, // Expect duration in seconds from form?
        bitrate: 0, // Requires audio analysis - set default
        bpm: fields.bpm?.[0] ? parseInt(fields.bpm[0], 10) : 0, // Expect BPM from form?
        featured_artists:
          fields.featuredArtists?.[0]
            ?.split(',')
            .map((a) => a.trim())
            .filter(Boolean) || [],
        writing_credits:
          fields.writingCredits?.[0]
            ?.split(',')
            .map((c) => c.trim())
            .filter(Boolean) || [],
        producing_credits:
          fields.producingCredits?.[0]
            ?.split(',')
            .map((p) => p.trim())
            .filter(Boolean) || [],
        language: fields.language?.[0] || 'English',
        description: audiusMetadata.description,
        release_type: fields.releaseType?.[0] || 'Single', // e.g., Single, Album, EP
        isrc: fields.isrc?.[0] || '',
        iswc: fields.iswc?.[0] || '',
      },
      is_active: true, // Default to active upon successful upload
      release_metrics: {
        // Initialize all metrics to zero
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
      tags: audiusMetadata.tags
        ? audiusMetadata.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      is_instrumental: fields.isInstrumental?.[0] === 'true' || false,
      is_explicit: fields.isExplicit?.[0] === 'true' || false,
      mood: fields.mood?.[0]?.toString() || '', // Store the raw string mood
      image_url: originalCoverUrl, // Store original URL if provided
      audio_url: originalTrackUrl, // Store original URL if provided
      video_url: fields.videoUrl?.[0] || null,
      dsp_links: {
        spotify: fields.spotifyUrl?.[0] || null,
        apple_music: fields.appleMusicUrl?.[0] || null,
        // Add other DSPs if needed
      },
      file_size: trackFileSize, // Store actual track file size
      // location data might come from user profile or form fields
      // release_location: { type: 'Point', coordinates: [longitude, latitude] },
      genre: fields.genre?.[0]?.toString() || 'Unknown', // Store raw string genre again for simpler querying?
      date_created: new Date(), // Timestamp for this MongoDB record creation
      last_updated: new Date(), // Timestamp for last update (same as creation initially)
      // Add any other fields required by your 'test_tracks' schema
      // e.g., autotags: [], beat_drop: 0, tempo: 0, clip_start_time: 0, nft: {}
    };
    console.log('MongoDB Document prepared:', mongoTrackData);

    // Insert into MongoDB
    const insertResult = await db
      .collection('test_tracks')
      .insertOne(mongoTrackData);

    // Check if insert was successful
    if (!insertResult.insertedId) {
      console.error('MongoDB insert failed:', insertResult);
      // Should we attempt to delete from Audius here? Complex rollback logic.
      throw {
        statusCode: 500,
        message: 'Failed to save track metadata to database.',
      };
    }
    console.log(
      `MongoDB insert successful. Inserted ID: ${insertResult.insertedId}`
    );

    // --- Cleanup Temporary Files ---
    console.log('Cleaning up temporary files...');
    const cleanupPromises = [];
    if (coverArtFormidable?.filepath) {
      cleanupPromises.push(
        fsPromises
          .unlink(validateTmpPath(coverArtFormidable.filepath))
          .catch((err) => console.error('Error cleaning up cover art:', err))
      );
    }
    if (trackFormidable?.filepath) {
      cleanupPromises.push(
        fsPromises
          .unlink(validateTmpPath(trackFormidable.filepath))
          .catch((err) => console.error('Error cleaning up track file:', err))
      );
    }
    await Promise.all(cleanupPromises);
    console.log('Temporary files cleanup attempted.');

    // --- Success Response ---
    return res.status(201).json({
      // Use 201 Created status
      message: 'Track uploaded and saved successfully.',
      audiusTrackId: audiusTrackId,
      mongoTrackId: insertResult.insertedId.toString(), // Return the MongoDB ID as string
      blockHash: blockHash,
      blockNumber: blockNumber,
    });
  } catch (error) {
    // --- Centralized Error Handling & Cleanup ---
    console.error('Error during upload process:', error.message || error);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }

    // Attempt cleanup even on error
    const cleanupPromises = [];
    if (coverArtFormidable?.filepath) {
      cleanupPromises.push(
        fsPromises
          .unlink(validateTmpPath(coverArtFormidable.filepath))
          .catch((err) =>
            console.error('Error cleaning up cover art on error:', err)
          )
      );
    }
    if (trackFormidable?.filepath) {
      cleanupPromises.push(
        fsPromises
          .unlink(validateTmpPath(trackFormidable.filepath))
          .catch((err) =>
            console.error('Error cleaning up track file on error:', err)
          )
      );
    }
    await Promise.all(cleanupPromises);
    console.log('Temporary files cleanup attempted after error.');

    // Use statusCode from thrown error or default to 500
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.message || 'An unexpected error occurred during upload.';

    return res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === 'development' && error.stack
          ? error.stack
          : undefined,
    });
  }
});

// --- GET Handler (Moods & Genres) ---
handler.get(async (req, res) => {
  const { type } = req.query;
  console.log(`GET request received for type: ${type}`);

  try {
    if (type === 'moods') {
      // Return array of mood strings
      const moods = Object.values(Mood);
      console.log('Returning moods:', moods);
      return res.status(200).json({ moods });
    }
    if (type === 'genres') {
      // Return array of genre strings
      const genres = Object.values(Genre);
      console.log('Returning genres:', genres);
      return res.status(200).json({ genres });
    }
    // If type is missing or invalid
    console.warn(`Invalid GET request type: ${type}`);
    return res.status(400).json({
      error: 'Invalid or missing type parameter. Use "moods" or "genres".',
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return res.status(500).json({ error: 'Failed to retrieve data.' });
  }
});

export default handler;
