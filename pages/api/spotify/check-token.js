// pages/api/spotify/check-token.js
import { getMongoDb } from '@/api-lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }

    const db = await getMongoDb();
    const tokenDoc = await db
      .collection('user_connections')
      .findOne({ service: 'spotify', uid });

    // If tokenDoc exists, user is "connected" (you could add extra checks if needed)
    const isConnected = !!tokenDoc;
    return res.status(200).json({ isConnected });
  } catch (error) {
    console.error('Error in check-token API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
