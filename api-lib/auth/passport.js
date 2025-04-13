import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { getMongoDb } from '@/api-lib/mongodb';
import admin from '@/lib/firebase-admin';
import { findUserForAuth } from '@/api-lib/db';

// Session-based authentication: store the MongoDB user _id in the session.
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize the user from the session by fetching from the database.
passport.deserializeUser((req, id, done) => {
  getMongoDb().then((db) => {
    findUserForAuth(db, id).then(
      (user) => done(null, user),
      (err) => done(err)
    );
  });
});

// Custom Firebase strategy: verify the Firebase token and then fetch the user from the DB.
passport.use(
  'firebase',
  new CustomStrategy(async (req, done) => {
    try {
      // Extract the Firebase ID token from the Authorization header or cookies.
      let token =
        req.headers.authorization?.replace(/^Bearer\s/, '') ||
        req.cookies?.firebaseToken;
      if (!token) {
        return done(null, false, {
          message: 'No Firebase token provided',
        });
      }

      // Verify the token using the Firebase Admin SDK.
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;
      if (!uid) {
        return done(null, false, { message: 'Invalid Firebase token' });
      }

      // Retrieve the user document from your database based on the Firebase UID.
      const db = await getMongoDb();
      const user = await findUserForAuth(db, uid);
      if (!user) {
        return done(null, false, {
          message: 'No user in DB for the given Firebase UID',
        });
      }

      // Successful authentication.
      return done(null, user);
    } catch (error) {
      console.error('Firebase authentication error:', error);
      return done(null, false, {
        message: 'Invalid or missing Firebase token',
      });
    }
  })
);

export default passport;
