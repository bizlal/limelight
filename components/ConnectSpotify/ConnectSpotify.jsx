// components/ConnectSpotify.js
import React from "react";
import styles from "./ConnectSpotify.module.css";
import { useSpotifyConnect } from "@/lib/connections/hooks";
import { useCurrentUser } from "@/lib/user";
export function ConnectSpotify() {
  const { isLoading, isConnected, redirectToSpotifyAuth } = useSpotifyConnect();
  const { data } = useCurrentUser();
  const user = data?.user;

  console.log("Current user:", user);
  console.log("isConnected:", isConnected, "isLoading:", isLoading);

  return (
    <button
      type="button"
      className={styles.spotifyButton}
      onClick={redirectToSpotifyAuth}
      disabled={isLoading || isConnected || !user || !user.uid}
    >
      {isConnected
        ? "Connected"
        : isLoading
        ? "Connecting..."
        : "Connect Spotify"}
    </button>
  );
}
