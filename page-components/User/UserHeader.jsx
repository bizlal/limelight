// /components/UserHeader.js
import { Avatar } from '@/components/Avatar';
import { Container } from '@/components/Layout';
import {
  FaSpotify,
  FaApple,
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaYoutube,
  FaLink,
} from 'react-icons/fa';
import { MdCalendarToday } from 'react-icons/md';

import styles from './UserHeader.module.css';

/**
 * user schema (for reference):
 * {
 *   username: string,
 *   name: string,
 *   userType: string,
 *   hometown: string,
 *   profileImage: string,
 *   headerImage: string,
 *   genres: string[],
 *   bio: string,
 *   total_following: number,
 *   total_followers: number,
 *   links: {
 *     website?: string,
 *     spotify?: string,
 *     itunes?: string,
 *     instagram?: string,
 *     twitter?: string,
 *     tiktok?: string,
 *     youtube?: string
 *   }
 *   // Possibly createdAt or isVerified, etc., if your DB includes these
 * }
 */

const UserHeader = ({ user }) => {
  // Build a stats array from user's actual numeric fields
  // Adjust or remove as you prefer:
  const stats = [
    {
      label: 'Following',
      value: user.total_following ?? 0,
    },
    {
      label: 'Followers',
      value: user.total_followers ?? 0,
    },
    {
      label: 'Type',
      value: user.userType ?? '',
    },
    {
      label: 'Location',
      value: user.hometown ?? '',
    },
  ];

  // A helper function to strip "https://" to keep link text tidy
  const formatLink = (url) => url.replace(/^https?:\/\//, '');

  // Example: if you have a field for "joined" date in user,
  // you can show it below. If not, remove or hardcode.
  // We’ll assume "createdAt" is an ISO date string.
  const joinedDateString = user.createdAt
    ? new Date(user.createdAt).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className={styles.headerCard}>
      {/* Cover / Header image as background */}
      <div
        className={styles.cover}
        style={{ backgroundImage: `url(${user.headerImage || ''})` }}
      >
        <div className={styles.coverOverlay} />
      </div>

      {/* Main content area */}
      <div className={styles.content}>
        {/* Avatar + optional verified badge */}
        <div className={styles.avatarContainer}>
          <Avatar size={128} username={user.username} url={user.profileImage} />
          {/* Show a verified badge if your user has "isVerified" */}
          {user.isVerified && (
            <img
              src="/verified-badge.png"
              alt="Verified"
              className={styles.verifiedBadge}
            />
          )}
        </div>

        {/* Name & Bio */}
        <h1 className={styles.name}>{user.name || user.username}</h1>
        {user.bio && <p className={styles.bio}>“{user.bio}”</p>}

        {/* Social / External Links Row */}
        <div className={styles.linksRow}>
          {/* Website */}
          {user.links?.website && (
            <a
              href={user.links.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaLink />
              <span>{formatLink(user.links.website)}</span>
            </a>
          )}
          {/* Spotify */}
          {user.links?.spotify && (
            <a
              href={user.links.spotify}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaSpotify />
              <span>Spotify</span>
            </a>
          )}
          {/* iTunes / Apple Music */}
          {user.links?.itunes && (
            <a
              href={user.links.itunes}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaApple />
              <span>Apple</span>
            </a>
          )}
          {/* Instagram */}
          {user.links?.instagram && (
            <a
              href={user.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram />
              <span>Instagram</span>
            </a>
          )}
          {/* Twitter */}
          {user.links?.twitter && (
            <a
              href={user.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter />
              <span>Twitter</span>
            </a>
          )}
          {/* TikTok */}
          {user.links?.tiktok && (
            <a
              href={user.links.tiktok}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTiktok />
              <span>TikTok</span>
            </a>
          )}
          {/* YouTube */}
          {user.links?.youtube && (
            <a
              href={user.links.youtube}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube />
              <span>YouTube</span>
            </a>
          )}

          {/* Joined Date (if available) */}
          <div className={styles.joined}>
            <MdCalendarToday />
            <span>Joined {joinedDateString}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          {stats.map((stat) => (
            <div className={styles.statItem} key={stat.label}>
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Optional: Display user's genres */}
        {user.genres && user.genres.length > 0 && (
          <div className={styles.genresList}>
            {user.genres.map((genre) => (
              <span key={genre} className={styles.genreTag}>
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHeader;
