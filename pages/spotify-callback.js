import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrentUser } from '@/lib/user';

export default function SpotifyCallback() {
  const router = useRouter();
  const [didExchange, setDidExchange] = useState(false);
  const { data } = useCurrentUser();
  const uid = data?.user?.uid;

  const { code, error } = router.query;

  useEffect(() => {
    // 1) If there's an error in the query, show or handle it
    if (error) {
      console.error('Spotify error:', error);
      return;
    }

    if (!uid) {
      console.error('No user ID found');
      return;
    } else {
      console.log('User ID found:', uid);
    }

    // 2) If we don't have a code or we already did the exchange, skip
    if (!code || didExchange) return;

    // 3) Mark we started
    setDidExchange(true);

    // 4) Call your exchange API
    axios
      .post('/api/spotify/exchange-token', { code, uid })
      .then(() => {
        // Successfully exchanged; redirect away
        router.replace('/settings');
      })
      .catch((err) => {
        console.error('Exchange error:', err?.response?.data || err);
      });
  }, [code, error, didExchange, router]);

  // Provide some UI feedback
  if (error) return <div>Error from Spotify: {error}</div>;
  if (!code) return <div>No code found in URL. Waiting...</div>;
  if (didExchange) return <div>Exchanging token with Spotify...</div>;

  return <div>Preparing to exchange token...</div>;
}
