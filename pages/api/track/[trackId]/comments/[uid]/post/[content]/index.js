import { postTrackComment } from '@/api-lib/db';
import { database } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(database);

handler.get(async (req, res) => {
  const comments = await postTrackComment(
    req.db,
    req.query.trackId,
    req.query.uid,
    req.query.content
  );
  res.json({ comments });
});

export default handler;
