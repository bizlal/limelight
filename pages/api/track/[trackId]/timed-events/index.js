import { getTrackActivity } from '@/api-lib/db';
import { database } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(database);

handler.get(async (req, res) => {
  const timed_events = await getTrackActivity(req.db, req.query.trackId);
  res.json({ timed_events });
});

export default handler;
