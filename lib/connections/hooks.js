import { useState, useEffect } from "react";
import { buildSpotifyAuthUrl, buildAppleMusicUrl } from "./utils";

export function useSpotifyConnect() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if the Spotify token exists (this could be more sophisticated in a real app)
  useEffect(() => {
    const token = localStorage.getItem("spotify_access_token");
    if (token) {
      setIsConnected(true);
    }
  }, []);

  const redirectToSpotifyAuth = () => {
    setIsLoading(true);
    const url = buildSpotifyAuthUrl();
    window.location.href = url;
  };

  return {
    isLoading,
    isConnected,
    redirectToSpotifyAuth,
  };
}

export function useAppleMusicConnect() {
  const [isLoading, setIsLoading] = useState(false);

  const redirectToAppleMusicAuth = () => {
    setIsLoading(true);
    // Typically for Apple, you might use MusicKit JS on the client,
    // but here's a placeholder to demonstrate a redirect if needed
    const url = buildAppleMusicUrl();
    window.location.href = url;
  };

  return {
    isLoading,
    redirectToAppleMusicAuth,
  };
}
