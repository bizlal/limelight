import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "@lukeed/ms";
import Image from "next/image";
import styles from "./Track.module.css";

/**
 * Example usage:
 * <Track
 *   track={{
 *     metadata: {
 *       track_title: 'Mask Off',
 *       artist: 'Future',
 *       cover_art: '/images/mask-off.jpg'
 *     },
 *     release_metrics: {
 *       total_likes: 123,
 *       total_reposts: 54,
 *       total_comments: 23,
 *       total_streams: 300
 *     },
 *     release_date: '2023-07-20T12:34:56Z'
 *   }}
 *   onPlay={(track) => console.log('Playing:', track)}
 * />
 */
export default function Track({ track, className, onPlay }) {
  // Destructure fields from the track object
  const {
    metadata: { track_title: title, artist, cover_art: coverUrl },
    release_metrics: {
      total_likes: likes,
      total_reposts: reposts,
      total_comments: comments,
      total_streams: streams,
    },
    release_date: createdAt,
  } = track;

  // For demonstration: toggles play/pause icon
  const [isPlaying, setIsPlaying] = useState(false);

  // Compute relative timestamp, e.g. "3 days ago"
  const timestampTxt = useMemo(() => {
    const diff = Date.now() - new Date(createdAt).getTime();
    if (diff < 60_000) return "Just now";
    return `${format(diff, true)} ago`;
  }, [createdAt]);

  // Handle play/pause clicks
  const handlePlayClick = () => {
    setIsPlaying((prev) => !prev);
    // Optionally notify a parent with the track data
    if (onPlay) onPlay(track);
  };

  return (
    <div className={clsx(styles.root, className)}>
      {/* Cover Image */}
      <div className={styles.coverWrapper}>
        <Image
          src={coverUrl}
          alt={title}
          className={styles.coverImage}
          layout="fill"
          objectFit="cover"
        />
      </div>

      {/* Main Text Content */}
      <div className={styles.info}>
        <div className={styles.topRow}>
          <div>
            <h2 className={styles.trackTitle}>{title}</h2>
            <p className={styles.artist}>{artist}</p>
          </div>

          {/* Engagement Stats */}
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M20.84 4.61c-1.22-1.22-2.84-2-4.61-2s-3.39.78-4.61 2l-.62.63-.62-.63C9.56 3.39 7.94 2.61 6.16 2.61S2.77 3.39 1.55 4.61C0.33 5.83 0 7.44 0 9.21c0 1.99 1.17 3.93 3.32 5.28l7.3 6.69c.21.19.49.29.79.29s.58-.1.79-.29l7.3-6.69C21.83 13.14 23 11.2 23 9.21c0-1.77-.78-3.39-2.16-4.6z"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {likes}
            </span>

            <span className={styles.statItem}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M4 17v2a2 2 0 002 2h12m2-2v-2a2 2 0 00-2-2H8l-4 4zm0-12v2a2 2 0 01-2 2H8l-4-4v-2a2 2 0 012-2h12a2 2 0 012 2z"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {reposts}
            </span>

            <span className={styles.statItem}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {comments}
            </span>
          </div>
        </div>

        {/* Secondary Info: Streams & Time */}
        <div className={styles.bottomRow}>
          <span className={styles.streamCount}>{streams} Streams</span>
          <span className={styles.timestamp}>{timestampTxt}</span>
        </div>
      </div>

      {/* Play Button */}
      <button
        className={styles.playBtn}
        aria-label="Play Track"
        onClick={handlePlayClick}
      >
        {isPlaying ? (
          // Pause Icon
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="currentColor"
            className={styles.playIcon}
          >
            <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
          </svg>
        ) : (
          // Play Icon
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="currentColor"
            className={styles.playIcon}
          >
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>
    </div>
  );
}
