import React from 'react';
import { useRouter } from 'next/router';
import {
  FaArrowLeft,
  FaEdit,
  FaEllipsisH,
  FaExternalLinkAlt,
  FaLocationArrow,
  FaPaperclip,
  FaSpotify,
} from 'react-icons/fa';
import { FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';
import { MdCalendarToday } from 'react-icons/md';

import { Avatar } from '@/components/Avatar';
import styles from './UserHeader.module.css';

/**
 * Example user shape:
 * {
 *   name: "Bilal Khalid",
 *   username: "bizlal",
 *   profileImage: "/path/to/avatar.jpg",
 *   headerImage: "/path/to/cover.jpg",
 *   bio: "Always on the grind",
 *   links: {
 *     instagram?: "https://instagram.com/...",
 *     twitter?: "https://twitter.com/...",
 *     youtube?: "https://youtube.com/...",
 *   },
 *   location: "Brentford, Canada",
 *   createdAt: "2021-01-15T00:00:00.000Z",
 *   tracksCount: 7,
 *   lmltStacked: 32000,
 *   total_following: 20,
 *   total_followers: 71
 *   ...
 * }
 */

const UserHeader = ({ user }) => {
  const router = useRouter();
  console.log(user);
  // Fallbacks in case fields are missing
  const displayName = user?.name || user?.username || 'Anonymous';
  const joinedDateString = user?.createdAt
    ? new Date(user.createdAt).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className={styles.profileWrapper}>
      {/* Optional label above the card */}

      <div className={styles.profileCard}>
        {/* Cover image */}
        <div
          className={styles.coverImage}
          style={{
            backgroundImage: `url(${
              user?.headerImage || '/default-cover.jpg'
            })`,
          }}
        >
          {/* Top controls: back arrow on the left, edit/more on the right */}
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>

          <div className={styles.actions}>
            <button className={styles.actionBtn} aria-label="Edit profile">
              <FaEdit />
            </button>
            <button className={styles.actionBtn} aria-label="More options">
              <FaEllipsisH />
            </button>
          </div>
        </div>

        <div className={styles.profileContent}>
          {/* User avatar */}
          <div className={styles.avatarSection}>
            <Avatar
              size={80}
              username={displayName}
              url={user?.profileImage || '/default-avatar.png'}
            />
          </div>

          {/* Name & Bio */}
          <h1 className={styles.userName}>{displayName}</h1>
          {user?.bio && <p className={styles.userBio}>"{user.bio}"</p>}

          {/* Social / location / joined row */}
          <div className={styles.metaRow}>
            {/* Example of an Website handle link */}
            {user?.links?.website && (
              <a
                href={user.links.website}
                target="_blank"
                rel="noreferrer"
                className={styles.metaItem}
              >
                <FaPaperclip /> {user.links.website.replace(/https?:\/\//, '')}
              </a>
            )}

            {/* Example of an Website handle link */}
            {user?.links?.spotify && (
              <a
                href={user.links.spotify}
                target="_blank"
                rel="noreferrer"
                className={styles.metaItem}
              >
                <FaSpotify /> {user.links.spotify.replace(/https?:\/\//, '')}
              </a>
            )}
            {/* Example of an Instagram handle link */}
            {user?.links?.instagram && (
              <a
                href={user.links.instagram}
                target="_blank"
                rel="noreferrer"
                className={styles.metaItem}
              >
                <FaInstagram />{' '}
                {user.links.instagram.replace(/https?:\/\//, '')}
              </a>
            )}
            {/* Example Twitter link */}
            {user?.links?.twitter && (
              <a
                href={user.links.twitter}
                target="_blank"
                rel="noreferrer"
                className={styles.metaItem}
              >
                <FaTwitter /> {user.links.twitter.replace(/https?:\/\//, '')}
              </a>
            )}
            {/* Example YouTube link */}
            {user?.links?.youtube && (
              <a
                href={user.links.youtube}
                target="_blank"
                rel="noreferrer"
                className={styles.metaItem}
              >
                <FaYoutube /> YouTube
              </a>
            )}

            {/* Location */}
            {user?.hometown && (
              <span>
                <FaLocationArrow /> {user?.hometown}
              </span>
            )}

            {/* Joined date */}
            <span className={styles.metaItem}>
              <MdCalendarToday />
              Joined {joinedDateString}
            </span>
          </div>

          {/* Stats row (tracks, LMLT, following, followers) */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <h3>{user?.tracksCount ?? 0}</h3>
              <p>Tracks</p>
            </div>
            <div className={styles.statItem}>
              <h3>
                {user?.lmltStacked ? user.lmltStacked.toLocaleString() : 0}
              </h3>
              <p>LMLT</p>
            </div>
            <div className={styles.statItem}>
              <h3>{user?.total_following ?? 0}</h3>
              <p>Following</p>
            </div>
            <div className={styles.statItem}>
              <h3>{user?.total_followers ?? 0}</h3>
              <p>Followers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
