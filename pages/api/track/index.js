import { ValidateProps } from '@/api-lib/constants';
import { createNewReleaseFinal } from '@/api-lib/db';
import { auths, validateBody } from '@/api-lib/middlewares';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.post(
  ...auths,
  async (req, res) => {
    const db = await getMongoDb();
    const track = req.body.track;

    const release = await createNewReleaseFinal(db, { track });

    console.log(release);
    return res.json({ release });
  }
);

export default handler;
