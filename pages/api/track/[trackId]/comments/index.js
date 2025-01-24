import { findComments } from '@/api-lib/db';
import { database } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(database);

handler.get(async (req, res) => {
  const comments = await findComments(
    req.db,
    req.query.uid,
    req.query.trackId,
    100,
  );
  res.json({ comments });
});

export default handler;
