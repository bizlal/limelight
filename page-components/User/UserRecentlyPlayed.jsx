// components/UserRecentlyPlayed.js
import React, { useState, useEffect } from 'react';
import { FaSpotify } from 'react-icons/fa';
import styles from './UserRecentlyPlayed.module.css';

// Helper to format the date as "x minutes/hours/days ago"
function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = (now - past) / 1000;

  if (diffInSeconds < 60) {
    const seconds = Math.floor(diffInSeconds);
    return seconds <= 1 ? 'just now' : `${seconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
}

const UserRecentlyPlayed = ({ user }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) return;

    const fetchRecentlyPlayed = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/recently-played?uid=${user.uid}`);
        if (!res.ok) {
          throw new Error('Error fetching recently played tracks');
        }
        const data = await res.json();
        setRecentlyPlayed(data.recentlyPlayed || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyPlayed();
  }, [user]);

  if (loading) {
    return (
      <div className={styles.message}>Loading recently played tracks...</div>
    );
  }
  if (error) {
    return (
      <div className={`${styles.message} ${styles.error}`}>Error: {error}</div>
    );
  }
  if (!recentlyPlayed.length) {
    return (
      <div className={styles.message}>No recently played tracks found.</div>
    );
  }

  return (
    <div className={styles.recentlyPlayedContainer}>
      <div className={styles.recentlyPlayedHeader}>
        <FaSpotify className={styles.spotifyIcon} />
        <h3 className={styles.recentlyPlayedTitle}>Recently Played Tracks</h3>
      </div>

      <ul className={styles.trackList}>
        {recentlyPlayed.map((item) => {
          const coverUrl =
            item.track.album?.images?.[0]?.url ||
            'https://via.placeholder.com/64?text=No+Image';

          return (
            <li key={item.played_at} className={styles.trackItem}>
              <div className={styles.coverContainer}>
                <img
                  src={coverUrl}
                  alt={`${item.track.album.name} cover`}
                  className={styles.trackCover}
                />
              </div>
              <div className={styles.trackDetails}>
                <span className={styles.trackName}>{item.track.name}</span>
                <span className={styles.trackArtists}>
                  {item.track.artists.map((artist) => artist.name).join(', ')}
                </span>
                <span className={styles.albumName}>
                  {item.track.album.name}
                </span>
              </div>
              <div className={styles.playedAt}>{timeAgo(item.played_at)}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UserRecentlyPlayed;
