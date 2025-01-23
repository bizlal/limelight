import { ValidateProps } from '@/api-lib/constants';
import { findPosts, insertPost } from '@/api-lib/db';
import { auths, validateBody } from '@/api-lib/middlewares';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.get(async (req, res) => {
  const db = await getMongoDb();

  const posts = await findPosts(
    db,
    req.query.before ? new Date(req.query.before) : undefined,
    req.query.by,
    req.query.limit ? parseInt(req.query.limit, 10) : undefined
  );

  res.json({ posts });
});

handler.post(
  ...auths,
  validateBody({
    type: 'object',
    properties: {
      content: ValidateProps.post.properties.content,
      uid: ValidateProps.post.properties.uid,
    },
    required: ['content'],
    additionalProperties: false,
  }),
  async (req, res) => {
    // if (!req.user) {
    //   return res.status(401).end();
    // }

    const db = await getMongoDb();
    console.log(req);
    const post = await insertPost(db, {
      content: req.body.content,
      uid: req.body.uid,
    });

    return res.json({ post });
  }
);

export default handler;
