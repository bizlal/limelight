// pages/spotify-callback.js
import { useRouter } from "next/router";
import { useEffect } from "react";
import axios from "axios";
import { useCurrentUserData } from "@/lib/user"; // adjust the path as needed

export default function SpotifyCallback() {
  const router = useRouter();
  const { code, error } = router.query;
  const { user } = useCurrentUserData();

  useEffect(() => {
    // Ensure both the code and user (with uid) are available
    if (code && user && user.uid) {
      axios
        .post("/api/spotify/exchange-token", { code, uid: user.uid })
        .then((response) => {
          const { access_token, refresh_token, expires_in } = response.data;
          // (For UI purposes) Save tokens in localStorage
          localStorage.setItem("spotify_access_token", access_token);
          localStorage.setItem("spotify_refresh_token", refresh_token);
          localStorage.setItem("spotify_expires_in", expires_in);
          console.log("Spotify tokens stored in local storage:", response.data);
          // Redirect after successful token exchange
          router.replace("/settings");
        })
        .catch((err) => {
          console.error("Token exchange error:", err);
        });
    }
  }, [code, user, router]);

  if (error) {
    return <div>Error from Spotify: {error}</div>;
  }

  return <div>Processing Spotify code...</div>;
}
