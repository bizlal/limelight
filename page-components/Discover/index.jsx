import { Spacer } from '@/components/Layout';
import styles from './Discover.module.css';

// pages/discover.js
import React from 'react';
import { useDiscover } from '@/lib/discover/hooks';
import { SharedSong } from '@/components/SharedSong/SharedSong';
import Poster from '../Feed/Poster';
import ShareTrack from './ShareTrack';

const DiscoverPage = () => {
  const { tracks, loading, error } = useDiscover();

  if (loading) {
    return <div className={styles.message}>Loading discovered tracks...</div>;
  }

  if (error) {
    return <div className={styles.message}>Error: {error}</div>;
  }

  if (!tracks || tracks.length === 0) {
    return <div className={styles.message}>No tracks found.</div>;
  }

  return (
    <div className={styles.discoverContainer}>
      <h1 className={styles.title}>Discover New Tracks</h1>
      <div className={styles.trackGrid}>
        {tracks.map((track) => (
          <div key={track.id} className={styles.trackItem}>
            <SharedSong track={track} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoverPage;

export const Discover = () => {
  return (
    <div className={styles.root}>
      <Spacer size={1} axis="vertical" />
      <ShareTrack />
      <DiscoverPage />
    </div>
  );
};
