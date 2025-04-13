import passport from '@/api-lib/auth/passport';
import { auths } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(...auths);

// For login: use the custom Firebase strategy.
handler.post(passport.authenticate('firebase'), (req, res) => {
  res.json({ user: req.user });
});

// For logout: destroy the session.
handler.delete(async (req, res) => {
  await req.session.destroy();
  res.status(204).end();
});

export default handler;
