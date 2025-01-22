// /api-lib/middlewares/session.js
import { getMongoClient } from '@/api-lib/mongodb';
import MongoStore from 'connect-mongo';
import nextSession from 'next-session';
import { promisifyStore } from 'next-session/lib/compat';

const mongoStore = MongoStore.create({
  clientPromise: getMongoClient(),
  stringify: false,
});

const getSession = nextSession({
  store: promisifyStore(mongoStore),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 7 * 24 * 60 * 60, // 2 weeks
    sameSite: 'strict',
    path: '/',
  },
  touchAfter: 7 * 24 * 60 * 60, // 1 week
});

export default async function session(req, res, next) {
  await getSession(req, res);
  next();
}
