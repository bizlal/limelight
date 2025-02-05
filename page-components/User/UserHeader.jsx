import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  FaArrowLeft,
  FaEdit,
  FaEllipsisH,
  FaLocationArrow,
  FaGlobe,
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaYoutube,
} from 'react-icons/fa';
import { MdCalendarToday } from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import styles from './UserHeader.module.css';

const UserHeader = ({ user, currentUser }) => {
  const router = useRouter();

  // Example logic to determine if this is the signed-in user's own profile
  // Adjust as needed to match your auth flow.
  const isOwner = currentUser?.uid === user?.uid;

  // Local state for follow/unfollow demo
  const [isFollowing, setIsFollowing] = useState(false);

  // Derived values
  const displayName = user?.name || user?.username || 'Anonymous';
  const joinedDateString = user?.createdAt
    ? new Date(user.createdAt).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  // Handlers
  const handleFollowToggle = () => {
    // Real app: call API to follow/unfollow, then set state
    setIsFollowing(!isFollowing);
  };

  const handleEditProfile = () => {
    // e.g. push to /edit-profile or open a modal
    alert('Edit profile clicked!');
  };

  const handleCopyProfileUrl = () => {
    const profileUrl = window.location.href;
    navigator.clipboard.writeText(profileUrl);
    alert('Profile URL copied!');
  };

  return (
    <div className={styles.profileContainer}>
      {/* Cover */}
      <div className={styles.coverSection}>
        <div
          className={styles.coverImage}
          style={{
            backgroundImage: `url(${
              user?.headerImage || '/default-cover.jpg'
            })`,
          }}
        />
        <div className={styles.coverOverlay} />

        {/* Back button */}
        <button className={styles.backButton} onClick={() => router.back()}>
          <FaArrowLeft />
        </button>
      </div>

      {/* User info card (overlaps cover) */}
      <div className={styles.userInfoCard}>
        {/* Avatar */}
        <div className={styles.avatarWrapper}>
          <Avatar
            size={120}
            username={displayName}
            url={user?.profileImage || '/default-avatar.png'}
          />
        </div>

        {/* Name & handle */}
        <h1 className={styles.userName}>{displayName}</h1>
        {user?.username && user.username !== displayName && (
          <p className={styles.userHandle}>@{user.username}</p>
        )}

        {/* Bio */}
        {user?.bio && <p className={styles.userBio}>{user.bio}</p>}

        {/* Meta row: location + joined date */}
        <div className={styles.metaRow}>
          {user?.hometown && (
            <span className={styles.metaItem}>
              <FaLocationArrow /> {user.hometown}
            </span>
          )}
          <span className={styles.metaItem}>
            <MdCalendarToday /> Joined {joinedDateString}
          </span>
        </div>

        {/* Row for user type + genres (left to right) */}
        <div className={styles.typeGenreRow}>
          {user?.userType && (
            <span className={styles.userTypeBadge}>{user.userType}</span>
          )}
          {user?.genres?.length > 0 && (
            <div className={styles.genresRow}>
              {user.genres.map((genre) => (
                <span key={genre} className={styles.genreBadge}>
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Links row (show website + colored icons) */}
        {user?.links && (
          <div className={styles.linksRow}>
            {user.links.website && (
              <a
                href={user.links.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <FaGlobe style={{ color: '#58a6ff' }} />
                {user.links.website}
              </a>
            )}

            {user.links.instagram && (
              <a
                href={user.links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <FaInstagram style={{ color: '#C13584' }} />
                Instagram
              </a>
            )}

            {user.links.twitter && (
              <a
                href={user.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <FaTwitter style={{ color: '#1DA1F2' }} />
                Twitter
              </a>
            )}

            {user.links.tiktok && (
              <a
                href={user.links.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <FaTiktok style={{ color: '#000000' }} />
                TikTok
              </a>
            )}

            {user.links.youtube && (
              <a
                href={user.links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <FaYoutube style={{ color: '#FF0000' }} />
                YouTube
              </a>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className={styles.actionsRow}>
          {/* If it's the owner, show Edit Profile. Otherwise, show Follow/Following */}
          {isOwner ? (
            <>
              <button className={styles.editBtn} onClick={handleEditProfile}>
                <FaEdit />
                <span>Edit Profile</span>
              </button>
              <div className={styles.dropdownWrapper}>
                <button className={styles.moreBtn}>
                  <FaEllipsisH />
                </button>
                <div className={styles.dropdownMenu}>
                  <button onClick={handleCopyProfileUrl}>
                    Copy Profile URL
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button className={styles.followBtn} onClick={handleFollowToggle}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <div className={styles.dropdownWrapper}>
                <button className={styles.moreBtn}>
                  <FaEllipsisH />
                </button>
                <div className={styles.dropdownMenu}>
                  <button onClick={handleCopyProfileUrl}>
                    Copy Profile URL
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <h3>{user?.lmltStacked?.toLocaleString() || 0}</h3>
            <p>LMLT</p>
          </div>
          <div className={styles.statItem}>
            <h3>{user?.tracksCount ?? 0}</h3>
            <p>Track</p>
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
  );
};

export default UserHeader;
