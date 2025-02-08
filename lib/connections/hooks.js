// hooks/useSpotifyConnect.js
import { useState, useEffect } from 'react';
import { buildSpotifyAuthUrl } from './utils'; // adjust path as needed

export function useSpotifyConnect(uid) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    async function checkToken() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/spotify/check-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        });
        const data = await response.json();
        setIsConnected(data.isConnected);
      } catch (error) {
        console.error('Error checking Spotify token:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkToken();
  }, [uid]);

  const redirectToSpotifyAuth = () => {
    // direct user to your Spotify OAuth entry point
    // e.g., an endpoint that starts the OAuth flow
    const url = buildSpotifyAuthUrl();
    window.location.href = url;
  };

  return {
    isLoading,
    isConnected,
    redirectToSpotifyAuth,
  };
}
