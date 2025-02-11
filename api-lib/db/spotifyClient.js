// api-lib/db/spotifyClient.js
import axios from 'axios';
import crypto from 'crypto';
import { findSpotifyTokens } from './connections.js';
import { parseSpotifyTrackUrl } from './spotifyUrlParser.js';

const clientId = 'cad0010433854df8a32000b92a73d369';
const clientSecret = '2a9f8e5dfa984a8fb122b8e542192eaf';

// If your actual redirect URL is different, adjust below:
const redirectUri = 'https://limelight-server.vercel.app/api/spotify';

// ----------------------------------------------------------------------------
// Time Helpers
function isAccessTokenExpired(expiresAt) {
  return Date.now() > expiresAt;
}

function calculateAccessTokenExpirationTime(expiresIn) {
  return Date.now() + expiresIn * 1000;
}

// ----------------------------------------------------------------------------
// Create a Track Object from Spotify Track Data
function createTrackObject(spotifyTrack, uid) {
  return {
    track_id: crypto.randomUUID(),
    uid,
    metadata: {
      duration: spotifyTrack.duration_ms,
      artist: spotifyTrack.artists?.[0]?.name || '',
      featured_artists:
        spotifyTrack.artists && spotifyTrack.artists.length > 1
          ? spotifyTrack.artists
              .slice(1)
              .map((artist) => artist.name)
              .join(', ')
          : '',
      album_title: spotifyTrack.album?.name || '',
      track_title: spotifyTrack.name || '',
      primary_genre: '',
      secondary_genre: '',
      language: 'English',
      release_type: spotifyTrack.album?.album_type || '',
      release_date: new Date(spotifyTrack.album?.release_date).getTime() || 0,
      isrc: spotifyTrack.external_ids?.isrc || '',
      cover_art: spotifyTrack.album?.images?.[0]?.url || '',
      file_size: 0,
      bitrate: 0,
      bpm: 0,
    },
    is_active: true,
    release_metrics: {
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_skips: 0,
      total_replays: 0,
      total_unique_listeners: 0,
      total_impressions: 0,
      dsp_clicks: {
        spotify: 0,
        apple_music: 0,
      },
      total_outreach: 0.0,
      total_shares: 0,
      total_comments: 0,
      total_reposts: 0,
      total_saves: 0,
    },
    clip_start_time: 0,
    tags: ['Hip Hop'],
    genre: '',
    is_instrumental: false,
    is_explicit: spotifyTrack.explicit || false,
    mood: '',
    image_url: spotifyTrack.album?.images?.[0]?.url || '',
    audio_url: spotifyTrack.preview_url || '',
    video_url: '',
    dsp_links: {
      spotify: spotifyTrack.external_urls?.spotify || '',
      apple_music: '',
    },
    mongodb_location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    release_location: {
      city: '',
      state: '',
      country: '',
      continent: '',
      latitude: '0.0',
      longitude: '0.0',
      geohash: '',
    },
    spotify_obj: spotifyTrack, // Keep the original Spotify object for debugging
  };
}

// ----------------------------------------------------------------------------
// DB Insert & Build
async function addSpotifyTrackToDb(db, uid, spotifyTrack) {
  const trackObj = createTrackObject(spotifyTrack, uid);
  const posts = db.collection('user_posts');
  const result = await posts.insertOne(trackObj);
  console.log('Track added to posts collection:', result.insertedId);
  return trackObj;
}

// ----------------------------------------------------------------------------
// Exported Functions

/**
 * getSpotifyTrackAndAddToDb:
 * Fetch a Spotify track by trackId and insert it in DB
 */
export async function getSpotifyTrackAndAddToDb(db, uid, trackId) {
  try {
    const { accessToken } = await getToken(db, uid);
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const trackData = response.data;
    if (!trackData) {
      throw new Error(`No track found for trackId: ${trackId}`);
    }
    return await addSpotifyTrackToDb(db, uid, trackData);
  } catch (error) {
    console.error('Error while fetching and adding track:', error);
    throw error;
  }
}

/**
 * getSpotifyTrackByUrl:
 * Extract track ID from a Spotify URL and add to DB.
 */
export async function getSpotifyTrackByUrl(db, uid, url) {
  try {
    const trackId = parseSpotifyTrackUrl(url);
    if (!trackId) {
      throw new Error('Could not extract track ID from URL');
    }
    return await getSpotifyTrackAndAddToDb(db, uid, trackId);
  } catch (error) {
    console.error('Error getting Spotify track by URL:', error);
    throw error;
  }
}

/**
 * getToken:
 * Retrieve the user's token doc from DB and refresh if expired.
 */
export async function getToken(db, uid) {
  try {
    const tokenDoc = await db
      .collection('spotify_tokens')
      .findOne({ service: 'spotify', uid });

    if (!tokenDoc) {
      throw new Error(
        'No valid Spotify tokens available. Please connect your Spotify account.'
      );
    }

    let {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    } = tokenDoc;

    // If access token is missing or expired, attempt refresh:
    if (!accessToken || !refreshToken || isAccessTokenExpired(expiresAt)) {
      if (!refreshToken) {
        throw new Error(
          'No valid Spotify tokens available. Please connect your Spotify account.'
        );
      }
      const refreshedTokens = await refreshAccessToken(refreshToken);
      accessToken = refreshedTokens.accessToken;
      refreshToken = refreshedTokens.refreshToken;
      expiresAt = calculateAccessTokenExpirationTime(refreshedTokens.expiresIn);

      // Update DB
      await db.collection('user_connections').updateOne(
        { service: 'spotify', uid },
        {
          $set: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
          },
        }
      );
      console.log('Updated Spotify token:', accessToken);
    }

    return { accessToken, refreshToken, expiresAt };
  } catch (error) {
    console.error('Error while getting access token:', error);
    throw error;
  }
}

/**
 * refreshAccessToken:
 * Use Spotify’s API to get a new access token from a refresh token.
 */
export async function refreshAccessToken(refreshToken) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  try {
    console.log('Refreshing Spotify access token...');
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
    });
    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
    } = response.data;
    console.log('New access token:', accessToken);
    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken, // If Spotify doesn't return a new refresh token, reuse the old one
      expiresIn,
    };
  } catch (error) {
    console.error(
      'Error while refreshing access token:',
      error.response?.data || error
    );
    throw error;
  }
}
