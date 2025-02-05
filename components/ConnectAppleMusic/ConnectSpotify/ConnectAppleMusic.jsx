// components/ConnectAppleMusic.jsx
import React from "react";
import styles from "./ConnectAppleMusic.module.css";
import { useAppleMusicConnect } from "@/lib/connections";

export default function ConnectAppleMusic() {
  const { isLoading, redirectToAppleMusicAuth } = useAppleMusicConnect();

  return (
    <button
      className={styles.appleMusicButton}
      onClick={redirectToAppleMusicAuth}
      disabled={isLoading}
    >
      {isLoading ? "Connecting..." : "Connect Apple Music"}
    </button>
  );
}
