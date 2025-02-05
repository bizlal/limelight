// /api-lib/auth/passport.js
import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { getMongoDb } from '@/api-lib/mongodb';
import { verifyPrivyAndGetUser } from '@/api-lib/privy';
import { findUserForAuth } from '@/api-lib/db';

// Optional: for session-based
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((req, id, done) => {
  getMongoDb().then((db) => {
    findUserForAuth(db, id).then(
      (user) => done(null, user),
      (err) => done(err)
    );
  });
});

// Example custom "privy" strategy
passport.use(
  'privy',
  new CustomStrategy(async (req, done) => {
    try {
      const { dbUser } = await verifyPrivyAndGetUser(req);
      if (!dbUser) {
        return done(null, false, { message: 'No user in DB for Privy token' });
      }
      return done(null, dbUser);
    } catch (err) {
      console.error('PrivyStrategy error:', err);
      return done(null, false, { message: 'Invalid or missing Privy token' });
    }
  })
);

export default passport;
