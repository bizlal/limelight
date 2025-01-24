/**
 * getUserFromDb - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
async function getUserFromDb(db, uid) {
  let user = await db
    .collection('users2')
    .findOne({ uid })
    .then((user) => user || null);

  return user;
}

/**
 * addNotification - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} engagement_data - Description
 */
export async function addNotification(
  db,
  uid,
  title,
  content,
  engagement_data
) {
  // Create a notificationsCollection handle
  const notificationsCollection = db.collection('user_notifications');

  // Add the title, content and engagement_data to the engagement_data object

  // Store the notification in a separate document in the notifications collection
  const result = await notificationsCollection.insertOne({
    uid,
    title,
    content,
    notification: engagement_data,
    createdAt: new Date(),
  });

  // Increment the unread notifications counter for the user
  await incrementUnreadNotifications(db, uid);

  // Return the result
  return result.insertedCount;
}

/**
 * incrementUnreadNotifications - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
export async function incrementUnreadNotifications(db, uid) {
  const usersCollection = db.collection('users2');
  const result = await usersCollection.updateOne(
    { uid },
    { $inc: { 'profile.unread_notifications': 1 } }
  );
  return result.modifiedCount;
}

export async function getActivityNotificationsByUid(db, uid) {
  try {
    const user = await getUserFromDb(db, uid);

    const notifications = await db
      .collection('user_notifications')
      .aggregate([
        {
          $match: {
            uid,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: 'users2',
            localField: 'notification.uid',
            foreignField: 'uid',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            uid: 1,
            title: 1,
            content: 1,
            notification: {
              profileUID: '$notification.profile_uid',
              trackID: '$notification.track_id',
              uid: '$notification.uid',
              title: '$notification.title',
              mongodbLocation: '$notification.mongodb_location',
              elapsedTime: '$notification.elapsed_time',
              isPlayingTrack: '$notification.is_playing_track',
              dateCreated: '$notification.date_created',
              type: '$notification.type',
            },
            createdAt: 1,
            user: 1,
          },
        },
        {
          $addFields: {
            trackIDNotNull: { $ne: ['$notification.trackID', null] },
          },
        },
        {
          $lookup: {
            from: 'test_tracks',
            localField: 'notification.trackID',
            foreignField: 'track_id',
            as: 'track',
          },
        },
        {
          $addFields: {
            track: {
              $cond: ['$trackIDNotNull', { $arrayElemAt: ['$track', 0] }, null],
            },
          },
        },
        {
          $lookup: {
            from: 'user_following',
            let: {
              followerUid: '$uid',
              profileUid: '$notification.profile_uid',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$uid', '$$profileUid'] },
                      { $eq: ['$profile_uid', '$$followerUid'] },
                    ],
                  },
                },
              },
              // Project to simplify the output
              {
                $project: {
                  _id: 0,
                  followed: { $literal: true },
                },
              },
            ],
            as: 'userIsFollowingArray',
          },
        },
        // Transform the userIsFollowingArray into a boolean
        {
          $addFields: {
            isUserFollowing: { $gt: [{ $size: '$userIsFollowingArray' }, 0] },
          },
        },
        // Remove the temporary array field
        {
          $project: {
            userIsFollowingArray: 0,
          },
        },
      ])
      .toArray();

    const newNotificationsCount = user.profile.unread_notifications;
    const newNotifications = notifications.slice(0, newNotificationsCount);
    const remainingNotifications = notifications.slice(newNotificationsCount);

    const today = new Date();
    const thisWeekNotifications = [];
    const thisMonthNotifications = [];
    const previousNotifications = [];

    remainingNotifications.forEach((notification) => {
      const notificationDate = new Date(notification.createdAt);

      if (isWithinThisWeek(notificationDate, today)) {
        thisWeekNotifications.push(notification);
      } else if (isWithinThisMonth(notificationDate, today)) {
        thisMonthNotifications.push(notification);
      } else {
        previousNotifications.push(notification);
      }
    });

    const categorizedNotifications = {
      new: newNotifications,
      thisWeek: thisWeekNotifications,
      thisMonth: thisMonthNotifications,
      previous: previousNotifications,
    };

    await resetUnreadNotifications(db, uid);

    return categorizedNotifications;
  } catch (error) {
    // Handle the error appropriately
    console.error('Error in getActivityNotificationsByUid:', error);
    throw error;
  }
}

// Helper function to check if a date is within the current week
function isWithinThisWeek(date, today) {
  const oneWeekAgo = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 7
  );
  return date > oneWeekAgo && date <= today;
}

// Helper function to check if a date is within the current month
function isWithinThisMonth(date, today) {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return date > startOfMonth && date <= today;
}

/**
 * resetUnreadNotifications - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 */
export async function resetUnreadNotifications(db, uid) {
  const usersCollection = db.collection('users2');
  const result = await usersCollection.updateOne(
    { uid },
    { $set: { 'profile.unread_notifications': 0 } }
  );
  return result.modifiedCount;
}

// Map event types to functions that generate the title and content
const engagementEventHandlers = {
  follow: (u) => ({
    title: 'New Follower',
    content: `${u.profile.name} (@${u.profile.username}) is now following you.`,
  }),
  stream: (u) => ({
    title: 'New Stream',
    content: `${u.profile.name} (@${u.profile.username}) streamed your song.`,
  }),
  track_like: (u) => ({
    title: 'New Track Like',
    content: `${u.profile.name} (@${u.profile.username}) liked your song.`,
  }),
  track_dislike: (u) => ({
    title: 'Track Disliked',
    content: `${u.profile.name} (@${u.profile.username}) disliked your song.`,
  }),
  track_comment: (u) => ({
    title: 'New Track Comment',
    content: `${u.profile.name} (@${u.profile.username}) commented on your song.`,
  }),
  comment_reply: (u) => ({
    title: 'New Comment Reply',
    content: `${u.profile.name} (@${u.profile.username}) replied to your comment.`,
  }),
  comment_like: (u) => ({
    title: 'New Comment Like',
    content: `${u.profile.name} (@${u.profile.username}) liked your comment.`,
  }),
  profile_visit: (u) => ({
    title: 'New Profile Visit',
    content: `${u.profile.name} (@${u.profile.username}) visited your profile.`,
  }),
  profile_post: (u) => ({
    title: 'New Profile Post',
    content: `${u.profile.name} (@${u.profile.username}) posted on your profile.`,
  }),
  post_like: (u) => ({
    title: 'New Post Like',
    content: `${u.profile.name} (@${u.profile.username}) liked your post.`,
  }),
  post_reply: (u) => ({
    title: 'New Post Reply',
    content: `${u.profile.name} (@${u.profile.username}) replied to your post.`,
  }),
  track_spotify_click: (u) => ({
    title: 'New Spotify Click',
    content: `${u.profile.name} (@${u.profile.username}) clicked on your Spotify link.`,
  }),
  track_apple_music_click: (u) => ({
    title: 'New Apple Music Click',
    content: `${u.profile.name} (@${u.profile.username}) clicked on your Apple Music link.`,
  }),
  track_youtube_click: (u) => ({
    title: 'New YouTube Click',
    content: `${u.profile.name} (@${u.profile.username}) clicked on your YouTube link.`,
  }),
  track_share: (u) => ({
    title: 'New Track Share',
    content: `${u.profile.name} (@${u.profile.username}) shared your song.`,
  }),
  track_edited: (u) => ({
    title: 'Track Edited',
    content: `${u.profile.name} (@${u.profile.username}) edited their song.`,
  }),
  track_uploaded: (u) => ({
    title: 'Track Uploaded',
    content: `${u.profile.name} (@${u.profile.username}) uploaded a new song.`,
  }),
  account_deleted: (u) => ({
    title: 'Account Deleted',
    content: `${u.profile.name} (@${u.profile.username}) deleted their account.`,
  }),
  account_created: (u) => ({
    title: 'Account Created',
    content: `${u.profile.name} (@${u.profile.username}) created their account.`,
  }),
};

export async function addEngagementEvent(
  db,
  uid,
  profile_uid,
  type,
  track_id = null
) {
  let u = await getUserFromDb(db, uid);
  let p = await getUserFromDb(db, profile_uid);
  let timestamp = Math.floor(Date.now());
  const { title, content } = engagementEventHandlers[type](u);
  let engagement_data = {
    profile_uid,
    track_id,
    uid,
    title,
    mongodb_location: {
      type: 'Point',
      coordinates: [
        parseFloat(u.location.longitude),
        parseFloat(u.location.latitude),
      ],
    },
    elapsed_time: 0,
    is_playing_track: false,
    date_created: timestamp,
    type,
  };
  console.log(engagement_data);
  // Check if the type is valid
  if (!(type in engagementEventHandlers)) {
    console.log(`Unknown engagement type: ${type}`);
    return;
  }

  trackEvent(
    'engagement',
    type,
    `${u.location.state}, ${u.location.country}`,
    1,
    u.profile.username
  );

  await addNotification(db, p.uid, title, content, engagement_data);
  const imageUrl = u.profile.image
    ? u.profile.image
    : `https://ui-avatars.com/api/?background=random&name=${u.profile.name?.replaceAll(
        ' ',
        '+'
      )}`;
  const notificationObject = {
    fcmToken: p.fcmToken,
    title,
    content,
    imageUrl,
    dataPayload: { title, content, imageUrl, type },
  };

  console.log(notificationObject);
  console.log('Sending notification to user: ', p.uid);
  await sendNotification(db, notificationObject);

  // eslint-disable-next-line consistent-return
  return await db
    .collection('user_engagement')
    .insertOne(engagement_data)
    .then((result) => {
      console.log(`Successfully inserted item with _id: ${result.insertedId}`);
      return result;
    });
}

/**
 * addEngagementEvent - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} profile_uid - Description
 * @param {type} type - Description
 */
export async function addEngagementEvent2(db, uid, profile_uid, type) {
  let u = await getUserFromDb(db, uid);
  let p = await getUserFromDb(db, profile_uid);
  let timestamp = Math.floor(Date.now());
  trackEvent();
  let engagement_data = {
    profile_uid,
    track_id: '',
    uid,
    latitude: u.location.latitude,
    longitude: u.location.longitude,
    city: u.location.city,
    state: u.location.state,
    country: u.location.country,
    mongodb_location: {
      type: 'Point',
      coordinates: [
        parseFloat(u.location.longitude),
        parseFloat(u.location.latitude),
      ],
    },
    elapsed_time: 0,
    is_playing_track: false,
    date_created: timestamp,
    type,
  };

  var title = '';
  var content = '';
  const { fcmToken } = p;

  if (type == 'follow') {
    title = 'New Follower';
    content = `${u.profile.name} (@${u.profile.username}) is now following you.`;
    trackEvent(
      'engagement',
      'follow',
      `${u.location.state}, ${u.location.country}`,
      0,
      u.profile.username
    );
  } else if (type == 'stream') {
    title = 'New Stream';
    content = `${u.profile.name} (@${u.profile.username}) streamed your song.`;
    trackEvent(
      'engagement',
      'stream',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_like') {
    title = 'New Track Like';
    content = `${u.profile.name} (@${u.profile.username}) liked your song.`;
    trackEvent(
      'engagement',
      'track_like',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_dislike') {
    trackEvent(
      'engagement',
      'track_dislike',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_comment') {
    title = 'New Track Comment';
    content = `${u.profile.name} (@${u.profile.username}) commented on your song.`;
    trackEvent(
      'engagement',
      'comment',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'profile_visit') {
    title = 'New Profile Visit';
    content = `Somebody from ${u.location.state}, ${u.location.country} visited your profile.`;
    trackEvent(
      'engagement',
      'profile_visit',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'profile_post') {
    title = 'New Profile Post';
    content = `${u.profile.name} (@${u.profile.username}) posted on your profile.`;
    trackEvent(
      'engagement',
      'profile_post',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_spotify_click') {
    title = 'New Spotify Click';
    content = `${u.profile.name} (@${u.profile.username}) clicked on your Spotify link.`;
    trackEvent(
      'engagement',
      'track_spotify_click',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_apple_music_click') {
    title = 'New Apple Music Click';
    content = `${u.profile.name} (@${u.profile.username}) clicked on your Apple Music link.`;
    trackEvent(
      'engagement',
      'track_apple_music_click',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_youtube_click') {
    title = 'New YouTube Click';
    content = `${u.profile.name} (@${u.profile.username}) clicked on your YouTube link.`;
    trackEvent(
      'engagement',
      'track_youtube_click',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_share') {
    title = 'New Track Share';
    content = `${u.profile.name} (@${u.profile.username}) shared your song.`;
    trackEvent(
      'engagement',
      'track_share',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_edited') {
    title = 'Track Edited';
    content = `${u.profile.name} (@${u.profile.username}) edited their song.`;
    trackEvent(
      'engagement',
      'track_edited',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  } else if (type == 'track_uploaded') {
    title = 'Track Uploaded';
    content = `${u.profile.name} (@${u.profile.username}) uploaded a new song.`;
    trackEvent(
      'engagement',
      'track_uploaded',
      `${u.location.state}, ${u.location.country}`,
      1,
      u.profile.username
    );
  }
  await addNotification(db, uid, title, content, engagement_data);
  await sendNotification(db, {
    fcmToken,
    title,
    content,
    imageUrl: p.profile.image,
    engagement_data,
  });
  return await db
    .collection('user_engagement')
    .insertOne(engagement_data)
    .then((result) => {
      console.log(`Successfully inserted item with _id: ${result.insertedId}`);

      return result;
    });
}

/**
 * sendNotificationByUID - Description
 * @param {type} db - Description
 * @param {type} uid - Description
 * @param {type} title - Description
 * @param {type} content - Description
 * @returns {type} sendNotification(db, - Description
 */
export async function sendNotificationByUID(db, uid, title, content) {
  const u = await getUserFromDb(db, uid);
  console.log(u.profile.image);
  const { fcmToken } = u;

  return await sendNotification(db, {
    fcmToken,
    title,
    content,
    imageUrl: u.profile.image,
    dataPayload: { title, content, imageUrl: u.profile.image, type: 'test' },
  });
}

/**
 * sendNotification - Description
 * @param {type} db - Description
 * @param {type} { fcmToken - Description
 * @param {type} title - Description
 * @param {type} content } - Description
 * @returns {Promise} - Description
 */
async function sendNotification(
  db,
  { fcmToken, title, content, imageUrl, dataPayload }
) {
  const message = {
    token: fcmToken,
    notification: {
      title,
      body: content,
      image: imageUrl,
    },
    data: dataPayload, // Additional data payload
    android: {
      notification: {
        imageUrl,
      },
    },
    apns: {
      payload: {
        aps: {
          'mutable-content': 1,
          alert: {
            title,
            body: content,
          },
          'content-available': 1,
        },
      },
      fcm_options: {
        image: imageUrl,
      },
    },
    webpush: {
      headers: {
        image: imageUrl,
      },
      notification: {
        icon: imageUrl,
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    return 'Error sending message: ' + error;
  }
}
