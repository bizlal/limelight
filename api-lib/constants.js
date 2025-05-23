export const ValidateProps = {
  user: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 4, maxLength: 20 },
      name: { type: 'string' },
      userType: { type: 'string' },
      hometown: { type: 'string' },
      profileImage: { type: 'string' },
      headerImage: { type: 'string' },
      genres: {
        type: 'array',
        items: { type: 'string' },
      },
      bio: { type: 'string', minLength: 0, maxLength: 160 },
      total_following: { type: 'number' },
      total_followers: { type: 'number' },
      links: {
        type: 'object',
        properties: {
          website: { type: 'string', nullable: true },
          spotify: { type: 'string', nullable: true },
          itunes: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          twitter: { type: 'string', nullable: true },
          tiktok: { type: 'string', nullable: true },
          youtube: { type: 'string', nullable: true },
        },
      },
    },
    additionalProperties: false,
  },
  post: {
    type: 'object',
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 280 },
      uid: { type: 'string', minLength: 1, maxLength: 280 },
    },
    additionalProperties: false,
  },

  comment: {
    type: 'object',
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 280 },
    },
    additionalProperties: false,
  },

  release: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      track_id: { type: 'string' },
      uid: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          duration: { type: 'number' },
          artist: { type: 'string' },
          featured_artists: { type: 'string' },
          writing_credits: { type: 'string' },
          producing_credits: { type: 'string' },
          album_title: { type: 'string' },
          track_title: { type: 'string' },
          language: { type: 'string' },
          description: { type: 'string' },
          release_type: { type: 'string' },
          release_date: { type: 'number' },
          isrc: { type: 'string' },
          cover_art: { type: 'string' },
          bitrate: { type: 'number' },
          bpm: { type: 'number' },
          primary_genre: { type: 'string' },
          secondary_genre: { type: 'string' },
        },
        additionalProperties: false,
      },
      is_active: { type: 'boolean' },
      release_metrics: {
        type: 'object',
        properties: {
          total_likes: { type: 'number' },
          total_dislikes: { type: 'number' },
          total_streams: { type: 'number' },
          total_skips: { type: 'number' },
          total_replays: { type: 'number' },
          total_unique_listeners: { type: 'number' },
          total_impressions: { type: 'number' },
          dsp_clicks: {
            type: 'object',
            properties: {
              spotify: { type: 'number' },
              apple_music: { type: 'number' },
            },
            additionalProperties: false,
          },
          total_outreach: { type: 'number' },
          total_shares: { type: 'number' },
          total_comments: { type: 'number' },
          total_reposts: { type: 'number' },
          total_saves: { type: 'number' },
        },
        additionalProperties: false,
      },
      clip_start_time: { type: 'number' },
      tags: { type: 'array', items: { type: 'string' } },
      is_instrumental: { type: 'boolean' },
      is_explicit: { type: 'boolean' },
      mood: { type: 'string' },
      image_url: { type: 'string' },
      audio_url: { type: 'string' },
      video_url: { type: 'string' },
      dsp_links: {
        type: 'object',
        properties: {
          spotify: { type: 'string' },
          apple_music_url: { type: 'string' },
        },
        additionalProperties: false,
      },
      nft: {
        type: 'object',
        properties: {
          owner_address: { type: 'string', nullable: true },
          contract_address: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
      mongodb_location: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          coordinates: { type: 'array', items: { type: 'number' } },
        },
        additionalProperties: false,
      },
      release_location: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          geohash: { type: 'string' },
          latitude: { type: 'string' },
          longitude: { type: 'string' },
          continent: { type: 'string' },
        },
        additionalProperties: false,
      },
      genre: { type: 'string' },
      autotags: { type: 'array', items: { type: 'string' } },
      beat_drop: { type: 'number' },
      bitrate: { type: 'number' },
      duration: { type: 'number' },
      file_size: { type: 'number' },
      tempo: { type: 'number' },
    },
    additionalProperties: false,
  },
};
