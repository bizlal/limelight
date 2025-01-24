import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import normalizeEmail from 'validator/lib/normalizeEmail';
import { addEngagementEvent } from '@/api-lib/db';
import { dbProjectionUsers } from '.';

/**
 * getDiscoveryTracksByGenreAndUID - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} genres - Description
 */
export async function getDiscoveryTracksByGenreAndUID(db, uid, genres) {
  const ids = [];
  let i = 0;
  const blacklist = await db
    .collection('user_discovered_tracks')
    .find({ uid: { $in: [uid] } })
    .toArray()
    .then((tracks) => {
      while (i < tracks.length) {
        ids.push(tracks[i].track_id);
        i += 1;
      }
    });

  return db
    .collection('test_tracks')
    .find({ track_id: { $nin: ids }, genre: { $in: genres } })
    .limit(100)
    .sort({
      'metrics.total_comments': -1,
      'dsp_clicks.apple_music': -1,
      'dsp_clicks.spotify': 1,
      'metrics.total_likes': -1,
      'metrics.total_saves': 1,
      'metrics.total_outreach': -1,
    })
    .toArray()
    .then((items) => {
      console.log(`Successfully found ${items.length} documents.`);

      // items.forEach(console.log)
      return items;
    });
}
/**
 * getEngagementWeights - Description
 * @param {type}  - Description
 */
export async function getEngagementWeights() {
  // get total counts in past 30 days
  // get min/max of totals in past 30 days

  const streams = { total: 0, recent_max: 0, recent_min: 0 };
  const likes = { total: 0, recent_max: 0, recent_min: 0 };
  const dislikes = { total: 0, recent_max: 0, recent_min: 0 };
  const spotify_clicks = { total: 0, recent_max: 0, recent_min: 0 };
  const apple_music_clicks = { total: 0, recent_max: 0, recent_min: 0 };
  const social_shares = { total: 0, recent_max: 0, recent_min: 0 };
  const inaction = { total: 0, recent_max: 0, recent_min: 0 }; // listened to it, did nothing
  const skips = { total: 0, recent_max: 0, recent_min: 0 };
  const replays = { total: 0, recent_max: 0, recent_min: 0 };
  const engagement = { total: 0, recent_max: 0, recent_min: 0 };

  const { max_likes } = doc;
  const { max_saves } = doc;
  const { max_dsp_clicks } = doc;
  const { max_shares } = doc;
  const min_likes = 0;
  const min_saves = 0;
  const min_dsp_clicks = 0;
  const min_shares = 0;
  const min_upload_date = 1561680067;
}
const STREAM = 'stream';
const LIKE = 'like';
const DISLIKE = 'dislike';
const SPOTIFY_CLICK = 'spotify_click';
const APPLE_MUSIC_CLICK = 'apple_music_click';
const SOCIAL_SHARE = 'social_share';
const INACTION = 'inaction';
const SKIP = 'skip'; // can only happen on first impression
const IMPRESSION = 'impression';
const LISTENER = 'listener';
const REPLAY = 'replay';

/**
 * updateTrackEngagement - Description
 * @param {type} db - Description
 * @param {type} type - Description
 * @param {type} uid - Description
 * @param {type} track_id - Description
 */
function updateTrackEngagement(db, type, uid, track_id) {
  // increment engagement type
}

/**
 * recordTrackEngagement - Description
 * @param {type} engagementType - Description
 */
export async function recordTrackEngagement(engagementType) {
  switch (engagementType) {
    case LIKE:
      console.log('like');
      break;
    case DISLIKE:
      console.log('dislike');
      break;
    default:
      updateTrackEngagement();
  }
}

/**
 * postTrackComment - Description
 * @param {type} db - Description
 * @param {type} trackId - Description
 * @param {type} uid - Description
 * @param {type} content - Description
 */
export async function postTrackComment(db, trackId, uid, content) {
  const all_tracks_collection = db.collection('test_tracks');
  const id = new ObjectId();
  const data = {
    _id: id,
    comment_id: id.toString(),
    track_id: trackId,
    uid,
    content,
    likes: 0,
    replies: 0,
    date_created: Date.now(),
  };
  await db
    .collection('track_comments')
    .insertOne(data)
    .then((result) =>
      console.log(`Successfully inserted item with _id: ${result.insertedId}`)
    )
    .catch((err) => console.error(`Failed to insert item: ${err}`));
  await all_tracks_collection
    .updateOne(
      { track_id: trackId },
      { $inc: { 'release_metrics.total_comments': 1 } }
    )
    .then((result) => {
      const { matchedCount, modifiedCount } = result;
      if (matchedCount && modifiedCount) {
        console.log(`Successfully incremented the item.`);
      }
    })
    .catch((err) => console.error(`Failed to update the item: ${err}`));
}
/**
 * getTrackComments - Description
 * @param {type} db - Description
 * @param {type} trackId - Description
 * @param {type} limit = 100 - Description
 * @returns {type} db - Description
 */
export async function getTrackComments(db, trackId, limit = 100) {
  return db
    .collection('track_comments')
    .aggregate([
      {
        $match: {
          track_id: trackId,
        },
      },
      { $sort: { date_created: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users2',
          localField: 'uid',
          foreignField: 'uid',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ])
    .toArray();
}

/**
 * incrementTrackMetric - Description
 * @param {type} metric - Description
 * @param {type} trackId - Description
 * @param {type} inc - Description
 */
async function incrementTrackMetric(metric, trackId, inc) {
  const all_tracks_collection = db.collection('Releases');
  await all_tracks_collection
    .updateOne({ track_id: trackId }, { $inc: { metric: inc } })
    .then((result) => {
      const { matchedCount, modifiedCount } = result;
      if (matchedCount && modifiedCount) {
        console.log(`Successfully updated the item.`);
      }
    })
    .catch((err) => console.error(`Failed to update the item: ${err}`));
}

/**
 * findTrackById - Description
 * @param {type} db - Description
 * @param {type} id - Description
 */
export async function findTrackById(db, id) {
  const posts = await db
    .collection('test_tracks')
    .aggregate([
      { $match: { track_id: id } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'users2',
          localField: 'uid',
          foreignField: 'uid',
          as: 'artist',
        },
      },
      { $unwind: '$artist' },
      // { $project: dbProjectionUsers('creator.') },
    ])
    .toArray();
  if (!posts[0]) return null;
  return posts[0];
}

export async function getTrackActivity(db, trackId) {
  const collections = [
    { collection: 'user_discovered_tracks', valueKey: 'library' },
    'user_liked_tracks',
    'user_skipped_tracks',
    'user_disliked_tracks',
    'user_spotify_clicks',
    'user_apple_music_clicks',
    'user_reposted_tracks',
    'user_shared_tracks',
  ];

  const activity = {};

  for (const collection of collections) {
    const valueKey =
      typeof collection === 'string' ? null : collection.valueKey;
    const collectionName =
      typeof collection === 'string' ? collection : collection.collection;
    const query = valueKey ? { track_id: trackId } : { uid: trackId };
    const docs = await db.collection(collectionName).find(query).toArray();
    for (const doc of docs) {
      const timeKey = doc.elapsed_time || 'unknown_time';
      const action = valueKey
        ? doc[valueKey]
        : collectionName.replace('user_', '');

      if (!activity[timeKey]) {
        activity[timeKey] = [];
      }

      activity[timeKey].push(action);
    }
  }

  return activity;
}

/**
 * checkIfTrackInUserDiscovered - Description
 * @param {type} db - Description
 * @param {type} trackId - Description
 * @param {type} { uid } - Description
 */
export async function checkIfTrackInUserDiscovered(db, trackId, { uid }) {
  const user_discovered_tracks_collection = db.collection(
    'user_discovered_tracks'
  );

  const query = {
    track_id: trackId,
    uid,
  };

  const inLibrary = await user_discovered_tracks_collection
    .findOne(query, { projection: { metrics: 0 } })
    .then((doc) => {
      console.log(
        `${doc} documents match the specified query in user_discovered_tracks_collection`
      );
      return doc;
    })
    .catch((err) => console.error('Failed to count documents: ', err));

  return inLibrary;
}

export async function checkIfTrackInUserSaved(db, trackId, { uid }) {
  const user_saved_tracks_collection = db.collection('user_saved_tracks');

  const query = {
    track_id: trackId,
    uid,
  };

  const inLibrary = await user_saved_tracks_collection
    .findOne(query, { projection: { metrics: 0 } })
    .then((doc) => {
      console.log(
        `${doc} documents match the specified query in user_saved_tracks_collection`
      );
      return doc;
    })
    .catch((err) => console.error('Failed to count documents: ', err));

  return inLibrary;
}

export async function checkIfTrackInUseReposted(db, trackId, { uid }) {
  const user_reposted_tracks_collection = db.collection('user_reposted_tracks');

  const query = {
    track_id: trackId,
    uid,
  };

  const inLibrary = await user_reposted_tracks_collection
    .findOne(query, { projection: { metrics: 0 } })
    .then((doc) => {
      console.log(
        `${doc} documents match the specified query inuser_reposted_tracks_collection`
      );
      return doc;
    })
    .catch((err) => console.error('Failed to count documents: ', err));

  return inLibrary;
}

/**
 * checkIfUserLikedTrack - Description
 * @param {type} db - Description
 * @param {type} { uid - Description
 * @param {type} trackId } - Description
 */
export async function checkIfUserLikedTrack(db, { uid, trackId }) {
  const user_discovered_tracks_collection = db.collection(
    'user_discovered_tracks'
  );

  const query = {
    track_id: trackId,
    uid,
    library: 'user_liked_tracks',
  };

  const isLiked = await user_discovered_tracks_collection
    .count(query)
    .then((numDocs) => {
      console.log(
        `${numDocs} documents match the specified query in user_discovered_tracks_collection`
      );
      return numDocs == 1;
    })
    .catch((err) => console.error('Failed to count documents: ', err));

  return isLiked;
}

/**
 * addTrackToLibrary - Description
 * @param {type} db - Description
 * @param {type} trackId - Description
 * @param {type} artistUid - Description
 * @param {type} outreach - Description
 * @param {type} library - Description
 * @param {type} elapsedTime - Description
 * @param {type} uid - Description
 */
export async function addTrackToLibrary(
  db,
  trackId,
  artistUid,
  outreach,
  library,
  elapsedTime,
  uid
) {
  const collection = db.collection(library);
  const user_discovered_tracks_collection = db.collection(
    'user_discovered_tracks'
  );
  const user_saved_tracks_collection = db.collection('user_saved_tracks');
  const user_shared_tracks_collection = db.collection('user_shared_tracks');
  const user_dsp_tracks_collection = db.collection('user_dsp_tracks');
  const user_skipped_tracks_collection = db.collection('user_skipped_tracks');
  const user_streamed_tracks_collection = db.collection('user_streamed_tracks');
  const user_replayed_tracks_collection = db.collection('user_replayed_tracks');
  const track_engagement_collection = db.collection('track_engagement');
  const all_tracks_collection = db.collection('test_tracks');
  const user_reposted_tracks_collection = db.collection('user_reposted_tracks');
  const query = {
    track_id: trackId,
    uid,
  };
  const timestamp = Math.floor(Date.now());
  const data = {
    uid,
    library,
    track_id: trackId,
    artist_uid: artistUid,
    outreach_on_creation: outreach,
    elapsed_time: elapsedTime,
    date_created: timestamp,
  };

  const trackFromAllTracks = await all_tracks_collection
    .findOne({ track_id: trackId })
    .then((doc) => {
      console.log(JSON.stringify(doc));
      return doc;
    })
    .catch((err) => console.error('Failed to count documents: ', err));

  const engagement_data = {
    uid,
    track_id: trackId,
    artist_uid: artistUid,
    type: library,
    elapsed_time: elapsedTime,
    outreach_on_creation: outreach,
    date_created: timestamp,
  };

  let param = '';
  if (library === 'user_saved_tracks') {
    param = 'release_metrics.total_saves';
    const is_not_saved = await user_saved_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (is_not_saved) {
      await collection
        .insertOne(data)
        .then((result) =>
          console.log(
            `Successfully inserted item with _id: ${result.insertedId}`
          )
        )
        .catch((err) => console.error(`Failed to insert item: ${err}`));
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_saves': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully incremented the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    } else {
      await collection
        .deleteOne(query)
        .then((result) =>
          console.log(
            `Successfully deleted item with _id: ${result.insertedId}`
          )
        )
        .catch((err) => console.error(`Failed to insert item: ${err}`));
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_saves': -1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully decremented the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    }
  } else if (library === 'user_reposted_tracks') {
    const is_not_reposted = await user_reposted_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (is_not_reposted) {
      await user_reposted_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_reposts': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    } else {
      await user_reposted_tracks_collection.remove({
        uid,
        track_id: trackId,
      });
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_reposts': -1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    }
  } else if (library === 'user_shared_tracks') {
    const is_not_shared = await user_shared_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (is_not_shared) {
      await user_shared_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_shares': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    }
  } else if (library === 'user_streamed_tracks') {
    const q2 = {
      track_id: trackId,
      uid,
    };

    const is_replay = await user_streamed_tracks_collection
      .count({
        track_id: trackId,
        uid,
        library: { $ne: 'user_skipped_tracks' },
      })
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 1;
      })

      .catch((err) => console.error('Failed to count documents: ', err));

    const is_not_streamed = await user_stusreamed_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    const now = Date.now();

    // Subtract 1 minute (in milliseconds) from the current timestamp
    const oneMinuteAgo = Math.floor(now - 1 * 60 * 1000);

    const did_not_recently_stream = await user_streamed_tracks_collection
      .count({
        uid,
        track_id: trackId,
        date_created: {
          $gt: oneMinuteAgo,
        },
      })
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));
    const is_not_discovered = await user_discovered_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (is_not_discovered && !is_not_streamed) {
      // ensure more than 5 seconds before counting as skip
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_skips': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
      await user_discovered_tracks_collection
        .insertOne({
          uid,
          library: 'user_skipped_tracks',
          track_id: trackId,
          artist_uid: artistUid,
          outreach_on_creation: outreach,
          elapsed_time: elapsedTime,
          date_created: timestamp,
        })
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item with skip.`);
          }
        });
    }

    if (is_not_streamed) {
      await user_streamed_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_streams': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    } else if (did_not_recently_stream && is_replay) {
      await user_streamed_tracks_collection.insertOne(data);
      await user_replayed_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          {
            $inc: {
              'release_metrics.total_streams': 1,
              'release_metrics.total_replays': 1,
            },
          }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    } else if (did_not_recently_stream) {
      await addEngagementEvent(db, uid, artistUid, 'stream', trackId);
      await user_streamed_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          {
            $inc: {
              'release_metrics.total_streams': 1,
            },
          }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    }
  } else if (library === 'user_skipped_tracks') {
    const did_not_user_skip = await user_skipped_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (did_not_user_skip && elapsedTime > 5) {
      await user_skipped_tracks_collection.insertOne(data);
      await all_tracks_collection
        .updateOne(
          { track_id: trackId },
          { $inc: { 'release_metrics.total_skips': 1 } }
        )
        .then((result) => {
          const { matchedCount, modifiedCount } = result;
          if (matchedCount && modifiedCount) {
            console.log(`Successfully updated the item.`);
          }
        })
        .catch((err) => console.error(`Failed to update the item: ${err}`));
    }
  } else if (
    library === 'user_spotify_tracks' ||
    library === 'user_apple_music_tracks'
  ) {
    const is_not_dsp_opened = await user_dsp_tracks_collection
      .count(query)
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (is_not_dsp_opened) {
      await user_dsp_tracks_collection.insertOne(data);
      if (library === 'user_spotify_tracks') {
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.dsp_clicks.spotify': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
      } else if (library === 'user_apple_music_tracks') {
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.dsp_clicks.apple_music': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
      }
    }
  } else {
    const is_skipped = await user_discovered_tracks_collection
      .count({ track_id: trackId, uid, library: 'user_skipped_tracks' })
      .then((numDocs) => {
        console.log(
          `${numDocs} documents match the specified query in user_discovered_tracks_collection`
        );
        return numDocs === 0;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    if (!is_skipped) {
      if (library === 'user_liked_tracks') {
        param = 'release_metrics.total_likes';
        await user_discovered_tracks_collection.insertOne(data);
        console.log('added to user_discovered_tracks');

        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_likes': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
      } else if (library === 'user_disliked_tracks') {
        param = 'release_metrics.total_dislikes';
        await user_discovered_tracks_collection.insertOne(data);
        console.log('added to user_discovered_tracks');

        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_dislikes': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
      }
    } else {
      const is_discovered = await user_discovered_tracks_collection.findOne({
        track_id: trackId,
        uid,
      });
      const discovered_library = is_discovered.library;

      if (discovered_library !== 'user_skipped_tracks') {
        if (discovered_library !== library && library === 'user_liked_tracks') {
          await all_tracks_collection
            .updateOne(
              { track_id: trackId },
              { $inc: { 'release_metrics.total_dislikes': -1 } }
            )
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            })
            .catch((err) => console.error(`Failed to update the item: ${err}`));
          await all_tracks_collection
            .updateOne(
              { track_id: trackId },
              { $inc: { 'release_metrics.total_likes': 1 } }
            )
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            })
            .catch((err) => console.error(`Failed to update the item: ${err}`));
          await user_discovered_tracks_collection
            .updateOne(query, data)
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            });
        } else if (
          discovered_library !== library &&
          library === 'user_disliked_tracks'
        ) {
          await all_tracks_collection
            .updateOne(
              { track_id: trackId },
              { $inc: { 'release_metrics.total_likes': -1 } }
            )
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            })
            .catch((err) => console.error(`Failed to update the item: ${err}`));
          await all_tracks_collection
            .updateOne(
              { track_id: trackId },
              { $inc: { 'release_metrics.total_dislikes': 1 } }
            )
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            })
            .catch((err) => console.error(`Failed to update the item: ${err}`));
          await user_discovered_tracks_collection
            .updateOne(query, data)
            .then((result) => {
              const { matchedCount, modifiedCount } = result;
              if (matchedCount && modifiedCount) {
                console.log(`Successfully updated the item.`);
              }
            });
        }
      } else if (library === 'user_liked_tracks') {
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_skips': -1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_likes': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
        await user_discovered_tracks_collection
          .updateOne({ track_id: trackId, uid }, data)
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          });
      } else if (library === 'user_disliked_tracks') {
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_skips': -1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
        console.log('hello');
        await all_tracks_collection
          .updateOne(
            { track_id: trackId },
            { $inc: { 'release_metrics.total_dislikes': 1 } }
          )
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          })
          .catch((err) => console.error(`Failed to update the item: ${err}`));
        await user_discovered_tracks_collection
          .updateOne({ track_id: trackId, uid }, data)
          .then((result) => {
            const { matchedCount, modifiedCount } = result;
            if (matchedCount && modifiedCount) {
              console.log(`Successfully updated the item.`);
            }
          });
      }
    }
  }

  await track_engagement_collection
    .insertOne(engagement_data)
    .then((result) =>
      console.log(`Successfully inserted item with _id: ${result.insertedId}`)
    )
    .catch((err) => console.error(`Failed to insert item: ${err}`));

  return data;
}
/**
 * getTopTracks - Description
 * @param {type} db - Description
 */
async function getTopTracks(db) {
  const collection = db.collection('test_tracks');
  const tracks_collection = db.collection('release_top_charts');

  const tracks = await tracks_collection
    .find()
    .project({ track_id: 1 })
    .sort({ current_merit: -1 })
    .limit(100)
    .toArray();
  const track_ids = [];

  for (let i = 0; i < tracks.length; i++) {
    const discovered = tracks[i];
    track_ids.push(discovered.track_id);
  }

  const pipeline = [
    {
      $match: {
        track_id: {
          $in: track_ids,
        },
      },
    },

    {
      $sort: {
        'metadata.release_date': -1.0,
        'release_metrics.total_likes': -1.0,
        'release_metrics.total_shares': -1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 500.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}

/**
 * getUserUploadedTracks - Description
 * @param {type} db - Description
 * @param {type} uid2 - Description
 */
export async function getUserUploadedTracks(db, uid2) {
  const collection = db.collection('test_tracks');

  const pipeline = [
    {
      $match: {
        uid: {
          $in: [uid2],
        },
      },
    },

    {
      $sort: {
        'release_metrics.total_dislikes': 1.0,
        'metadata.release_date': -1.0,
        'release_metrics.total_shares': -1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 10.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}

export async function getLatestTracksByGenre(db, genres) {
  const collection = db.collection('test_tracks');

  const pipeline = [
    {
      $match: {
        genre: { $in: genres },
      },
    },

    {
      $sort: {
        'metadata.release_date': -1.0,
      },
    },
    {
      $limit: 24.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}

export async function getTopTracksByRangeV2(db, dateRange, userId) {
  const collection = db.collection(`top_tracks_${dateRange}`);
  const top_tracks = await collection
    .aggregate(
      [
        {
          $sort: { rank: 1 },
        },
        // Existing lookup for track
        {
          $lookup: {
            from: 'test_tracks',
            localField: 'track_id',
            foreignField: 'track_id',
            as: 'track',
          },
        },
        {
          $unwind: {
            path: '$track',
          },
        },

        // Adding lookup for user within track
        {
          $lookup: {
            from: 'users2',
            localField: 'track.uid',
            foreignField: 'uid',
            as: 'track.user',
          },
        },
        {
          $unwind: {
            path: '$track.user',
          },
        },

        // Adding lookup to check if the user liked the track
        {
          $lookup: {
            from: 'user_discovered_tracks',
            let: { trackId: '$track_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$track_id', '$$trackId'] },
                      { $eq: ['$uid', userId] },
                      { $eq: ['$library', 'user_liked_tracks'] },
                    ],
                  },
                },
              },
            ],
            as: 'userLiked',
          },
        },
        // Adding lookup to check if the user saved the track
        {
          $lookup: {
            from: 'user_saved_tracks',
            let: { trackId: '$track_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$track_id', '$$trackId'] },
                      { $eq: ['$uid', userId] },
                    ],
                  },
                },
              },
            ],
            as: 'userSaved',
          },
        },
        // Adding lookup to check if the user reposted the track
        {
          $lookup: {
            from: 'user_reposted_tracks',
            let: { trackId: '$track_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$track_id', '$$trackId'] },
                      { $eq: ['$uid', userId] },
                    ],
                  },
                },
              },
            ],
            as: 'userReposted',
          },
        },
        // Projecting the necessary fields
        {
          $project: {
            _id: 1,
            track_id: 1,
            rank: 1,
            previous_rank: 1,
            count: 1,
            track: 1,
            userDidLike: {
              $cond: {
                if: { $gt: [{ $size: '$userLiked' }, 0] },
                then: true,
                else: false,
              },
            },
            userDidSave: {
              $cond: {
                if: { $gt: [{ $size: '$userSaved' }, 0] },
                then: true,
                else: false,
              },
            },
            userDidRepost: {
              $cond: {
                if: { $gt: [{ $size: '$userReposted' }, 0] },
                then: true,
                else: false,
              },
            },
          },
        },
      ],
      {
        allowDiskUse: false,
      }
    )
    .toArray();
  return top_tracks;
}
/**
 * getTopTracksByRange - Description
 * @param {type} db - Description
 * @param {type} dateRange - Description
 */
export async function getTopTracksByRange(db, dateRange, genre = null) {
  const collection = db.collection(`top_tracks_${dateRange}`);
  const matchGenre = genre ? { 'track.metadata.primary_genre': genre } : {};

  const top_tracks = await collection
    .aggregate(
      [
        // Existing lookup for track
        {
          $lookup: {
            from: 'test_tracks',
            localField: 'track_id',
            foreignField: 'track_id',
            as: 'track',
          },
        },
        {
          $unwind: {
            path: '$track',
          },
        },
        {
          $match: matchGenre,
        },
        // Adding lookup for user within track
        {
          $lookup: {
            from: 'users2',
            localField: 'track.uid',
            foreignField: 'uid',
            as: 'track.user',
          },
        },
        {
          $unwind: {
            path: '$track.user',
          },
        },
        {
          $sort: {
            rank: 1, // sort by rank in descending order
          },
        },
      ],
      {
        allowDiskUse: false,
      }
    )
    .toArray();
  return top_tracks;
}

/**
 * getTopArtistsByRange - Description
 * @param {type} db - Description
 * @param {type} dateRange - Description
 */
export async function getTopArtistsByRange(db, dateRange) {
  const collection = db.collection(`top_artists_${dateRange}`);
  const top_artists = await collection
    .aggregate(
      [
        {
          $lookup: {
            from: 'users2',
            localField: 'artist_uid',
            foreignField: 'uid',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
          },
        },
        { $project: dbProjectionUsers('user') },
        {
          $sort: {
            rank: 1, // sort by rank in descending order
          },
        },
      ],
      {
        allowDiskUse: false,
      }
    )
    .toArray();
  return top_artists;
}

/**
 * getTopListenersByRange - Description
 * @param {type} db - Description
 * @param {type} dateRange - Description
 */
export async function getTopListenersByRange(db, dateRange) {
  const collection = db.collection(`top_listeners_${dateRange}`);
  const top_listeners = await collection
    .aggregate(
      [
        {
          $lookup: {
            from: 'users2',
            localField: 'uid',
            foreignField: 'uid',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
          },
        },
        { $project: dbProjectionUsers('user') },
        {
          $sort: {
            rank: 1, // sort by rank in descending order
          },
        },
      ],
      {
        allowDiskUse: false,
      }
    )
    .toArray();
  return top_listeners;
}

/**
 * createNewReleaseFinal - Description
 * @param {type} db - Description
 * @param {type} { track } - Description
 */
export async function createNewReleaseFinal(db, { track }) {
  const { title } = track;
  const { artist } = track;
  const { genre } = track;
  const { uid } = track;
  const { image_url } = track;
  const { audio_url } = track;
  const { video_url } = track;
  const { spotify_url } = track;
  const { apple_music_url } = track;
  const lat = track.latitude;
  const lng = track.longitude;
  const { city } = track;
  const { state } = track;
  const { country } = track;
  const { continent } = track;
  const id = new ObjectId();
  const { duration } = track;
  const { file_size } = track;
  const { is_instrumental } = track;
  const { is_explicit } = track;
  const { writers } = track;
  const { producers } = track;
  const { features } = track;
  const { caption } = track;
  const timestamp = Math.floor(Date.now());
  const bitrate = Math.floor(file_size / duration);

  const { track_id } = track;
  const { is_edit } = track;

  let release = {
    _id: id,
    track_id: id.toString(),
    uid,
    metadata: {
      duration,
      artist,
      featured_artists: features,
      writing_credits: writers,
      producing_credits: producers,
      album_title: title,
      track_title: title,
      language: 'English',
      description: '',
      release_type: 'Single',
      release_date: timestamp,
      isrc: '',
      cover_art: image_url,
      bitrate,
      bpm: 0,
      primary_genre: genre,
      secondary_genre: genre,
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
      dsp_clicks: { spotify: 0, apple_music: 0 },
      total_outreach: 0,
      total_shares: 0,
      total_comments: 0,
      total_reposts: 0,
      total_saves: 0,
    },
    clip_start_time: 0,
    tags: [genre],
    is_instrumental,
    is_explicit,
    mood: '',
    image_url,
    audio_url,
    video_url,
    dsp_links: {
      spotify: spotify_url,
      apple_music_url,
    },
    nft: { owner_address: null, contract_address: null },
    mongodb_location: {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)],
    },
    release_location: {
      city,
      state,
      country,
      geohash: '',
      latitude: String(lat),
      longitude: String(lng),
      continent: '',
    },
    genre,
    autotags: [],
    beat_drop: 0,
    bitrate,
    duration,
    file_size,
    tempo: 0,
  };
  const collection = db.collection('test_tracks');
  const collection2 = db.collection('test_tracks2');
  if (track.is_edit) {
    await db
      .collection('test_tracks')
      .updateOne(
        { track_id, uid },
        {
          $set: {
            'metadata.artist': artist,
            'metadata.track_title': title,
            'metadata.featured_artists': features,
            'metadata.writing_credits': writers,
            'metadata.producing_credits': producers,
            caption,
            is_instrumental,
            is_explicit,
            image_url,
            audio_url,
            video_url,
            dsp_links: {
              spotify: spotify_url,
              apple_music_url,
            },
            genre,
            'metadata.cover_art': image_url,

            'metadata.primary_genre': genre,
            'metadata.secondary_genre': genre,
          },
        }
      )
      .then((result) => {
        const { matchedCount, modifiedCount } = result;
        if (matchedCount && modifiedCount) {
          console.log(`Successfully incremented the item.`);
        }
      })
      .catch((err) => console.error(`Failed to update the item: ${err}`));

    await addEngagementEvent(
      db,
      uid,
      'RyFcbEUP8IUucwNSbLoft6JovZJ3',
      'track_edited'
    );

    release = await db
      .collection('test_tracks')
      .findOne({ track_id, uid })
      .then((doc) => {
        console.log(JSON.stringify(doc));
        return doc;
      })
      .catch((err) => console.error('Failed to count documents: ', err));

    return release;
  }
  await collection
    .insertOne(release)
    .then((result) =>
      console.log(`Successfully inserted item with _id: ${result.insertedId}`)
    )
    .catch((err) => console.error(`Failed to insert item: ${err}`));
  await collection2
    .insertOne(release)
    .then((result) =>
      console.log(`Successfully inserted item with _id: ${result.insertedId}`)
    )
    .catch((err) => console.error(`Failed to insert item: ${err}`));

  // await addEngagementEvent(
  //   db,
  //   uid,
  //   'RyFcbEUP8IUucwNSbLoft6JovZJ3',
  //   'track_uploaded',
  //   release.track_id,
  // );
  return release;
}

/**
 * getUserTracksByLibrary - Description
 * @param {type} db - Description
 * @param {type} library - Description
 * @param {type} uid - Description
 */
async function getUserTracksByLibrary(db, library, uid) {
  const collection = db.collection('test_tracks');
  const tracks_collection = db.collection(library);
  const track_ids = [];
  if (library === 'new') {
    const tracks = await collection
      .find()
      .project({ track_id: 1 })
      .sort({ 'metadata.release_date': -1 })
      .limit(5)
      .toArray();

    for (var x = 0; x < tracks.length; x++) {
      const discovered = tracks[x];
      track_ids.push(discovered.track_id);
    }
  } else if (library === 'user_discovered_tracks') {
    const tracks = await tracks_collection
      .find({
        library: {
          $ne: 'user_skipped_tracks',
        },
        uid,
      })
      .project({ track_id: 1 })
      .sort({ date_created: -1 })
      .limit(50)
      .toArray();

    for (var x = 0; x < tracks.length; x++) {
      const discovered = tracks[x];
      track_ids.push(discovered.track_id);
    }
  } else {
    const tracks = await tracks_collection
      .find({
        uid,
      })
      .project({ track_id: 1 })
      .sort({ date_created: -1 })
      .limit(50)
      .toArray();

    for (let i = 0; i < tracks.length; i++) {
      const discovered = tracks[i];
      track_ids.push(discovered.track_id);
    }
  }

  const pipeline = [
    {
      $match: {
        track_id: {
          $in: track_ids,
        },
      },
    },

    {
      $sort: {
        'metadata.release_date': -1.0,
        'release_metrics.total_likes': -1.0,
        'release_metrics.total_shares': -1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 50.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}
/**
 * getUserDiscoveredTracks - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
async function getUserDiscoveredTracks(db, uid) {
  const collection = db.collection('test_tracks');
  const tracks_collection = db.collection('user_discovered_tracks');
  const tracks = await tracks_collection
    .find({
      uid,
    })
    .project({ track_id: 1 })
    .sort({ date_created: -1 })
    .limit(50)
    .toArray();
  const track_ids = [];

  for (let i = 0; i < tracks.length; i++) {
    const discovered = tracks[i];
    track_ids.push(discovered.track_id);
  }

  const pipeline = [
    {
      $match: {
        track_id: {
          $in: track_ids,
        },
      },
    },

    {
      $sort: {
        'metadata.release_date': -1.0,
        'release_metrics.total_likes': -1.0,
        'release_metrics.total_shares': -1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 50.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}
/**
 * run - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
async function run(db, uid) {
  const collection = db.collection('test_tracks');
  const discovered_tracks_collection = db.collection('user_discovered_tracks');
  const discovered_tracks = await discovered_tracks_collection
    .find({
      uid,
      library: {
        $nin: ['user_skipped_tracks'],
      },
    })
    .limit(50)
    .project({ track_id: 1 })
    .toArray();
  const discovered_track_ids = [];

  for (let i = 0; i < discovered_tracks.length; i++) {
    const discovered = discovered_tracks[i];
    discovered_track_ids.push(discovered.track_id);
  }

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [-79.843826, 43.255203],
        },
        distanceField: 'dist.calculated',
        query: {
          track_id: {
            $nin: discovered_track_ids,
          },
        },
        includeLocs: 'mongodb_location',
        spherical: true,
      },
    },
    // {
    //   $match: {
    //     track_id: {
    //       $nin: discovered_track_ids,
    //     },
    //     //   "genre": {
    //     //      "$in": genres
    //     //  }
    //   },
    // },

    {
      $sort: {
        'release_metrics.total_shares': -1.0,
        'metadata.release_date': -1.0,
        'release_metrics.total_likes': -1.0,
        'release_metrics.total_dislikes': 1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 50.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).limit(50).toArray();
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found`);

  return found_tracks;
}

/**
 * runNear - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} lat - Description
 * @param {type} lng - Description
 */
async function runNear(db, uid, lat, lng) {
  const collection = db.collection('test_tracks');
  const discovered_tracks_collection = db.collection('user_discovered_tracks');
  const discovered_tracks = await discovered_tracks_collection
    .find({
      uid,
      // library: {
      //   $nin: ['user_skipped_tracks'],
      // },
    })

    .project({ track_id: 1 })
    .toArray();
  const discovered_track_ids = [];

  for (let i = 0; i < discovered_tracks.length; i++) {
    const discovered = discovered_tracks[i];
    discovered_track_ids.push(discovered.track_id);
  }

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'dist.calculated',
        query: {
          track_id: {
            $nin: discovered_track_ids,
          },
        },
        includeLocs: 'mongodb_location',
        spherical: true,
      },
    },
    // {
    //   $match: {
    //     track_id: {
    //       $nin: discovered_track_ids,
    //     },
    //     //   "genre": {
    //     //      "$in": genres
    //     //  }
    //   },
    // },

    {
      $sort: {
        'dist.calculated': 1.0,
        'release_metrics.total_shares': -1.0,
        'metadata.release_date': -1.0,
        'release_metrics.total_likes': -1.0,
        'release_metrics.total_dislikes': 1.0,
        'release_metrics.total_streams': 1.0,
        'release_metrics.total_outreach': -1.0,
      },
    },
    {
      $limit: 50.0,
    },
    {
      $lookup: {
        from: 'users2',
        localField: 'uid',
        foreignField: 'uid',
        as: 'profile',
      },
    },

    {
      $unwind: {
        path: '$profile',
        includeArrayIndex: '0',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // const found_tracks = await collection.find(params).sort({ "total_likes": -1, "total_apple_music_clicks": -1, "total_spotify_clicks": -1, "total_comments": -1, "total_saves": -1, "outreach": -1 }).limit(100).toArray();
  // create an array of documents to insert
  const found_tracks = await collection.aggregate(pipeline).limit(50).toArray();
  console.log(JSON.stringify(pipeline));
  // this option prevents additional documents from being inserted if one fails
  console.log(`${found_tracks.length} documents were found near ${lat},${lng}`);

  return found_tracks;
}

/**
 * getTopTracksForUser - Description
 * @param {type} db - Description
 */
export async function getTopTracksForUser(db) {
  let library = [];
  const tracks = [];

  library = await getTopTracks(db);

  for (let i = 0; i < library.length; i++) {
    const track = library[i];
    const card = {
      id: '',
      title: 'How To Live Forever',
      artist: 'AR',
      genre: 'Hip-Hop',
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_comments: 0,
      total_shares: 0,
      total_reposts: 0,
      audio_url: 'hh',
      video_url: 'hh',
      image_url: 'hh',
      vibes: ['Hype'],
      total_outreach: 0,
      total_impressions: 0,
      in_library: '',
      saved: false,
      spotify: '',
      apple_music: '',
      artist_uid: '',
      user_profile: {
        name: 'AR Paisley',
        username: 'arpaisley',
        bio: '',
        webite_url: '',
        image_url: '',
        header_url: '',
        uid: '123',
        total_followers: 12,
        total_following: 14,
        total_releases: 0,
        total_playlists: 0,
      },
    };

    card.id = track.track_id;
    card.title = track.metadata.track_title;
    card.artist = track.metadata.artist;
    card.total_likes = track.release_metrics.total_likes;
    card.total_dislikes = track.release_metrics.total_dislikes;
    card.total_streams = track.release_metrics.total_streams;
    card.total_reposts = track.release_metrics.total_reposts;
    card.total_comments = track.release_metrics.total_comments;
    card.total_shares = track.release_metrics.total_shares;
    card.video_url = track.video_url;
    card.audio_url = track.audio_url;
    card.image_url = track.image_url;
    card.spotify = track.dsp_links.spotify;
    card.apple_music = track.dsp_links.apple_music;
    card.genre = track.genre;
    // card.vibes = ["Swag"];
    card.total_outreach = track.release_metrics.total_outreach;
    card.total_impressions = track.release_metrics.total_impressions;

    card.artist_uid = track.uid;
    card.artist = track.profile;

    tracks.push(card);
  }

  return tracks;
}
/**
 * getLibraryTracksByType - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} type - Description
 */
export async function getLibraryTracksByType(db, uid, type) {
  let library = [];
  const tracks = [];

  if (type === 'user_discovered_tracks') {
    library = await getUserDiscoveredTracks(db, uid);
  } else if (type === 'user_uploaded_tracks') {
    library = await getUserUploadedTracks(db, uid);
  } else {
    library = await getUserTracksByLibrary(db, type, uid);
  }
  for (let i = 0; i < library.length; i++) {
    const track = library[i];
    const card = {
      id: '',
      title: 'How To Live Forever',
      artist: 'AR',
      genre: 'Hip-Hop',
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_comments: 0,
      total_shares: 0,
      total_reposts: 0,
      audio_url: 'hh',
      video_url: 'hh',
      image_url: 'hh',
      vibes: ['Hype'],
      total_outreach: 0,
      total_impressions: 0,
      in_library: '',
      saved: false,
      spotify: '',
      apple_music: '',
      artist_uid: '',
      user_profile: {
        name: 'AR Paisley',
        username: 'arpaisley',
        bio: '',
        webite_url: '',
        image_url: '',
        header_url: '',
        uid: '123',
        total_followers: 12,
        total_following: 14,
        total_releases: 0,
        total_playlists: 0,
      },
    };

    card.id = track.track_id;
    card.title = track.metadata.track_title;
    card.artist = track.metadata.artist;
    card.total_likes = track.release_metrics.total_likes;
    card.total_dislikes = track.release_metrics.total_dislikes;
    card.total_streams = track.release_metrics.total_streams;
    card.total_reposts = track.release_metrics.total_reposts;
    card.total_comments = track.release_metrics.total_comments;
    card.total_shares = track.release_metrics.total_shares;
    card.video_url = track.video_url;
    card.audio_url = track.audio_url;
    card.image_url = track.image_url;
    card.spotify = track.dsp_links.spotify;
    card.apple_music = track.dsp_links.apple_music;
    card.genre = track.genre;
    // card.vibes = ["Swag"];
    card.total_outreach = track.release_metrics.total_outreach;
    card.total_impressions = track.release_metrics.total_impressions;

    card.artist_uid = track.uid;
    card.artist = track.profile;

    tracks.push(card);
  }
  return tracks;
}

/**
 * getNearDiscoveryTracksByUID - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} near - Description
 */
export async function getNearDiscoveryTracksByUID(db, uid, near) {
  const res = { response: 'success', tracks: [] };
  const feed = [];
  const loc = near.split(',');
  const lat = parseFloat(loc[0]);
  const lng = parseFloat(loc[1]);

  // swag
  const tracks = await runNear(db, uid, lat, lng);
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const card = {
      id: '',
      title: 'How To Live Forever',
      artist: 'AR',
      genre: 'Hip-Hop',
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_comments: 0,
      total_shares: 0,
      total_reposts: 0,
      audio_url: 'hh',
      video_url: 'hh',
      image_url: 'hh',
      vibes: ['Hype'],
      total_outreach: 0,
      total_impressions: 0,
      in_library: '',
      saved: false,
      spotify: '',
      apple_music: '',
      artist_uid: '',
      user_profile: {
        name: ' ',
        username: '',
        bio: '',
        webite_url: '',
        image_url: '',
        header_url: '',
        uid: '123',
        total_followers: 12,
        total_following: 14,
        total_releases: 0,
        total_playlists: 0,
      },
    };
    if (track.metadata) {
      card.id = track.track_id;
      card.title = track.metadata.track_title;
      card.artist = track.metadata.artist;
      card.total_likes = track.release_metrics.total_likes;
      card.total_dislikes = track.release_metrics.total_dislikes;
      card.total_streams = track.release_metrics.total_streams;
      card.total_reposts = track.release_metrics.total_reposts;
      card.total_comments = track.release_metrics.total_comments;
      card.total_shares = track.release_metrics.total_shares;
      card.video_url = track.video_url;
      card.audio_url = track.audio_url;
      card.image_url = track.image_url;
      card.spotify = track.dsp_links.spotify;
      card.apple_music = track.dsp_links.apple_music;
      card.genre = track.genre;
      // card.vibes = ["Swag"];
      card.total_outreach = track.release_metrics.total_outreach;
      card.total_impressions = track.release_metrics.total_impressions;

      card.artist_uid = track.uid;
      card.artist = track.profile;

      feed.push(card);
    }
  }
  return feed;
}
/**
 * getDiscoveryTracksByUID - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
export async function getDiscoveryTracksByUID(db, uid) {
  const res = { response: 'success', tracks: [] };
  const feed = [];
  // swag
  const tracks = await run(db, uid);
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const card = {
      id: '',
      title: 'How To Live Forever',
      artist: 'AR',
      genre: 'Hip-Hop',
      total_likes: 0,
      total_dislikes: 0,
      total_streams: 0,
      total_comments: 0,
      total_shares: 0,
      total_reposts: 0,
      audio_url: 'hh',
      video_url: 'hh',
      image_url: 'hh',
      vibes: ['Hype'],
      total_outreach: 0,
      total_impressions: 0,
      in_library: '',
      saved: false,
      spotify: '',
      apple_music: '',
      artist_uid: '',
      user_profile: {
        name: ' ',
        username: '',
        bio: '',
        webite_url: '',
        image_url: '',
        header_url: '',
        uid: '123',
        total_followers: 12,
        total_following: 14,
        total_releases: 0,
        total_playlists: 0,
      },
    };
    if (track.metadata) {
      card.id = track.track_id;
      card.title = track.metadata.track_title;
      card.artist = track.metadata.artist;
      card.total_likes = track.release_metrics.total_likes;
      card.total_dislikes = track.release_metrics.total_dislikes;
      card.total_streams = track.release_metrics.total_streams;
      card.total_reposts = track.release_metrics.total_reposts;
      card.total_comments = track.release_metrics.total_comments;
      card.total_shares = track.release_metrics.total_shares;
      card.video_url = track.video_url;
      card.audio_url = track.audio_url;
      card.image_url = track.image_url;
      card.spotify = track.dsp_links.spotify;
      card.apple_music = track.dsp_links.apple_music;
      card.genre = track.genre;
      // card.vibes = ["Swag"];
      card.total_outreach = track.release_metrics.total_outreach;
      card.total_impressions = track.release_metrics.total_impressions;

      card.artist_uid = track.uid;
      card.artist = track.profile;

      feed.push(card);
    }
  }
  return feed;
}

/**
 * insertTrack - Description
 * @param {type} db - Description
 * @param {type} {
    title - Description
 * @param {type} artist - Description
 * @param {type} image - Description
 * @param {type} video - Description
 * @param {type} audio - Description
 * @param {type} mood - Description
 * @param {type} genre - Description
 * @param {type} metrics - Description
 * @param {type} is_single - Description
 * @param {type} is_distributed - Description
 * @param {type} duration - Description
 * @param {type} location - Description
 * @param {type} dsp_links - Description
 * @param {type} outreach - Description
 * @param {type} token_id - Description
 * @param {type} owner_id - Description
 * @param {type} } - Description
 */
export async function insertTrack(
  db,
  {
    title,
    artist,
    image,
    video,
    audio,
    mood,
    genre,
    metrics,
    is_single,
    is_distributed,
    duration,
    location,
    dsp_links,
    outreach,
    token_id,
    owner_id,
  }
) {
  const track = {
    title,
    artist,
    image,
    video,
    audio,
    mood,
    genre,
    metrics,
    is_single,
    is_distributed,
    duration,
    location,
    dsp_links,
    outreach,
    token_id,
    owner_id,
  };

  const { insertedId } = await db
    .collection('test_tracks')
    .insertOne({ ...track });
  user._id = insertedId;
  return user;
}
