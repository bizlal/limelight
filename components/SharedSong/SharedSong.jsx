// components/SharedSong.jsx
import React, { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import styles from './SharedSong.module.css';

export const SharedSong = ({ track }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Toggle play/pause on button click.
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Sync local state with audio element events.
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className={styles.sharedSongContainer}>
      <div className={styles.coverWrapper}>
        <img
          src={track.image_url || 'https://via.placeholder.com/150'}
          alt={`${track.metadata.track_title} album cover`}
          className={styles.coverImage}
        />
      </div>
      <div className={styles.trackInfo}>
        <h3 className={styles.trackTitle}>{track.metadata.track_title}</h3>
        <p className={styles.trackArtists}>
          {track.metadata.artist}
          {track.metadata.featured_artists
            ? ` feat. ${track.metadata.featured_artists}`
            : ''}
        </p>
      </div>
      <div className={styles.playerControls}>
        <button onClick={handlePlayPause} className={styles.playButton}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        {/* The audio element is hidden, but controlled via the play button */}
        <audio ref={audioRef} src={track.audio_url} preload="auto" />
      </div>
    </div>
  );
};
