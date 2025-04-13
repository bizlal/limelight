import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { ncOpts } from '@/api-lib/nc';
import { slugUsername } from '@/lib/user';
import { validateBody } from '@/api-lib/middlewares';

const handler = nc(ncOpts);

handler.post(
  validateBody({
    type: 'object',
    properties: {
      uid: { type: 'string' },
      username: { type: 'string', minLength: 4, maxLength: 20 },
      name: { type: 'string' },
      userType: { type: 'string' },
      hometown: { type: 'string' },
      profileImage: { type: 'string' },
      headerImage: { type: 'string' },
      genres: {
        type: 'array',
        items: { type: 'string' },
      },
      bio: { type: 'string', minLength: 0, maxLength: 160 },
      total_following: { type: 'number' },
      total_followers: { type: 'number' },
      links: {
        type: 'object',
        properties: {
          website: { type: 'string', nullable: true },
          spotify: { type: 'string', nullable: true },
          itunes: { type: 'string', nullable: true },
          instagram: { type: 'string', nullable: true },
          twitter: { type: 'string', nullable: true },
          tiktok: { type: 'string', nullable: true },
          youtube: { type: 'string', nullable: true },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  }),
  async (req, res) => {
    try {
      const db = await getMongoDb();
      const {
        uid,
        username,
        name,
        userType,
        hometown,
        profileImage,
        headerImage,
        genres,
        bio,
        total_following,
        total_followers,
        links,
      } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'No Firebase UID provided' });
      }

      const sanitizedUsername = slugUsername(username || '');
      const now = new Date();

      const result = await db.collection('users2').findOneAndUpdate(
        { uid },
        {
          $setOnInsert: {
            uid,
            createdAt: now,
          },
          $set: {
            username: sanitizedUsername,
            name: name || '',
            userType: userType || 'fan',
            hometown: hometown || '',
            profileImage: profileImage || '',
            headerImage: headerImage || '',
            genres: genres || [],
            bio: bio || '',
            total_following: total_following || 0,
            total_followers: total_followers || 0,
            links: links || {},
            updatedAt: now,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      return res.status(201).json({ user: result.value });
    } catch (err) {
      console.error('Sign-up error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default handler;
