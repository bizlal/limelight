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

const UserHeader = ({ user }) => {
  // Just for example: Hardcode some "stats" here.
  // You can pull these from `user` if you have them in your db.
  const stats = [
    { label: 'Releases', value: '7' },
    { label: 'LMLT Stacked', value: '32k' },
    { label: 'Following', value: '20' },
    { label: 'Followers', value: '71' },
  ];

  // A helper function to strip "https://" to keep links tidy
  const formatLink = (url) => url.replace(/^https?:\/\//, '');

  return (
    <div className={styles.headerCard}>
      {/* Cover image background */}
      <div
        className={styles.cover}
        style={{ backgroundImage: `url(${user.profile.cover})` }}
      >
        <div className={styles.coverOverlay} />
      </div>

      {/* Main content area */}
      <div className={styles.content}>
        {/* Avatar + optional verified badge */}
        <div className={styles.avatarContainer}>
          <Avatar
            size={128}
            username={user.profile.username}
            url={user.profile.image}
          />
          {/* Example: show a verified badge if user.profile.isVerified is true */}
          {user.profile.isVerified && (
            <img
              src="/verified-badge.png"
              alt="Verified"
              className={styles.verifiedBadge}
            />
          )}
        </div>

        {/* Name & Bio */}
        <h1 className={styles.name}>{user.profile.name}</h1>
        {user.profile.bio && <p className={styles.bio}>"{user.profile.bio}"</p>}

        {/* Social / External Links Row */}
        <div className={styles.linksRow}>
          {/* Website */}
          {user.profile.links.website && (
            <a
              href={user.profile.links.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaLink />
              <span>{formatLink(user.profile.links.website)}</span>
            </a>
          )}

          {/* Spotify */}
          {user.profile.links.spotify && (
            <a
              href={user.profile.links.spotify}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaSpotify />
              <span>Spotify</span>
            </a>
          )}

          {/* iTunes / Apple Music */}
          {user.profile.links.itunes && (
            <a
              href={user.profile.links.itunes}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaApple />
              <span>Apple</span>
            </a>
          )}

          {/* Instagram */}
          {user.profile.links.instagram && (
            <a
              href={user.profile.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram />
              <span>Instagram</span>
            </a>
          )}

          {/* Twitter */}
          {user.profile.links.twitter && (
            <a
              href={user.profile.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter />
              <span>Twitter</span>
            </a>
          )}

          {/* TikTok */}
          {user.profile.links.tiktok && (
            <a
              href={user.profile.links.tiktok}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTiktok />
              <span>TikTok</span>
            </a>
          )}

          {/* YouTube */}
          {user.profile.links.youtube && (
            <a
              href={user.profile.links.youtube}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube />
              <span>YouTube</span>
            </a>
          )}

          {/* Example joined date */}
          <div className={styles.joined}>
            <MdCalendarToday />
            <span>Joined January 2021</span>
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
      </div>
    </div>
  );
};

export default UserHeader;
