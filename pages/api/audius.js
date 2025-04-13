// pages/api/audius.js
import nc from 'next-connect';
import { getMongoDb } from '@/api-lib/mongodb';
import { audiusSdk } from '@/components/ConnectAudius/ConnectSpotify/AudiusSDK';

const handler = nc();

// GET: fetch Audius profile by uid
handler.get(async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in query.' });
    }

    const db = await getMongoDb();
    const result = await db.collection('audiusProfiles').findOne({ uid });
    if (!result) {
      return res.status(404).json({ error: 'Audius profile not found.' });
    }

    return res.status(200).json({ profile: result.profile });
  } catch (error) {
    console.error('Error in GET audius API:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error.' });
  }
});

// GET: fetch Audius profile by handle
handler.get('/handle', async (req, res) => {
  try {
    const { handle } = req.query;
    if (!handle) {
      return res.status(400).json({ error: 'Missing handle in query.' });
    }

    const profile = await audiusSdk.getProfileByHandle(handle);
    if (!profile) {
      return res.status(404).json({ error: 'Audius profile not found.' });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error('Error in GET audius API by handle:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error.' });
  }
});

// POST: update Audius profile
handler.post(async (req, res) => {
  try {
    const { uid, audiusProfile } = req.body;
    if (!uid || !audiusProfile) {
      return res
        .status(400)
        .json({ error: 'Missing uid or audiusProfile in request body.' });
    }

    const db = await getMongoDb();
    await db
      .collection('audiusProfiles')
      .updateOne(
        { uid },
        { $set: { profile: audiusProfile } },
        { upsert: true }
      );

    return res
      .status(200)
      .json({ message: 'Audius profile updated successfully.' });
  } catch (error) {
    console.error('Error in POST audius API:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal server error.' });
  }
});

export default handler;
