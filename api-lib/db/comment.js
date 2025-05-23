import { ObjectId } from 'mongodb';
import { dbProjectionUsers } from '.';

export async function findComments(db, postId, before, limit = 10) {
  return db
    .collection('comments')
    .aggregate([
      {
        $match: {
          postId: new ObjectId(postId),
          ...(before && { createdAt: { $lt: before } }),
        },
      },
      { $sort: { _id: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'uid',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: '$creator' },
      { $project: dbProjectionUsers('creator.') },
    ])
    .toArray();
}

export async function insertComment(db, postId, { content, uid }) {
  const comment = {
    content,
    postId: new ObjectId(postId),
    uid,
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection('comments').insertOne(comment);
  comment._id = insertedId;
  return comment;
}
