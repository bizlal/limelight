// pages-components/Settings/Settings.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import { fetcher } from '@/lib/fetch';
import { useCurrentUser } from '@/lib/user';
import { ConnectSpotify } from '@/components/ConnectSpotify/ConnectSpotify';

import styles from './Settings.module.css';
import { ConnectAudius } from '@/components/ConnectAudius/ConnectSpotify/ConnectAudius';

const ALL_GENRES = [
  'Afrobeat',
  'Jazz',
  'Alternative',
  'Latin',
  'Country',
  'Rap',
  'Electronic',
  'Rock',
  'Reggae',
  'House',
  'Indie',
  'Alt Rock',
  'R&B',
  'Freestyle Rap',
];

/**
 * Displays an unverified email note with a "Verify" button.
 */
function EmailVerify({ user }) {
  const [status, setStatus] = useState('');

  const verify = useCallback(async () => {
    try {
      setStatus('loading');
      await fetcher('/api/user/email/verify', { method: 'POST' });
      toast.success('A verification email has been sent to your inbox.');
      setStatus('success');
    } catch (e) {
      toast.error(e.message);
      setStatus('');
    }
  }, []);

  if (user?.emailVerified) return null;

  return (
    <div className={styles.note}>
      <p style={{ marginRight: 'auto' }}>
        <strong>Note:</strong> Your email{' '}
        <span style={{ textDecoration: 'underline' }}>{user.email}</span> is
        unverified.
      </p>
      <button
        onClick={verify}
        disabled={status === 'loading' || status === 'success'}
        className={`${styles.btn} ${styles.btnSecondary}`}
      >
        {status === 'loading'
          ? 'Verifying...'
          : status === 'success'
          ? 'Email Sent!'
          : 'Verify'}
      </button>
    </div>
  );
}

/**
 * Allows changing a user's password (if local auth is enabled).
 */
function Auth() {
  const oldPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await fetcher('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: oldPasswordRef.current.value,
          newPassword: newPasswordRef.current.value,
        }),
      });
      toast.success('Your password has been updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
      oldPasswordRef.current.value = '';
      newPasswordRef.current.value = '';
    }
  }, []);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Change Password</h2>
      <form onSubmit={onSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Old Password</label>
          <input
            type="password"
            ref={oldPasswordRef}
            className={styles.input}
            placeholder="••••••"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>New Password</label>
          <input
            type="password"
            ref={newPasswordRef}
            className={styles.input}
            placeholder="••••••"
          />
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Main "About You" profile form.
 */
function AboutYou({ user, mutate }) {
  // Refs for text fields
  const userTypeRef = useRef(null);
  const usernameRef = useRef(null);
  const nameRef = useRef(null);
  const bioRef = useRef(null);
  const hometownRef = useRef(null);

  // Social links
  const websiteRef = useRef(null);
  const spotifyRef = useRef(null);
  const itunesRef = useRef(null);
  const instagramRef = useRef(null);
  const twitterRef = useRef(null);
  const tiktokRef = useRef(null);
  const youtubeRef = useRef(null);

  // Images
  const profileImageRef = useRef(null);
  const headerImageRef = useRef(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [headerImagePreview, setHeaderImagePreview] = useState('');

  // Genres
  const [selectedGenres, setSelectedGenres] = useState([]);

  // State for "Save" button
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill form with user data
  useEffect(() => {
    if (!user) return;

    userTypeRef.current.value = user.userType || 'Music Fan';
    usernameRef.current.value = user.username || '';
    nameRef.current.value = user.name || '';
    bioRef.current.value = user.bio || '';
    hometownRef.current.value = user.hometown || '';

    websiteRef.current.value = user.links?.website || '';
    spotifyRef.current.value = user.links?.spotify || '';
    itunesRef.current.value = user.links?.itunes || '';
    instagramRef.current.value = user.links?.instagram || '';
    twitterRef.current.value = user.links?.twitter || '';
    tiktokRef.current.value = user.links?.tiktok || '';
    youtubeRef.current.value = user.links?.youtube || '';

    setSelectedGenres(user.genres || []);
    setProfileImagePreview(user.profileImage || '');
    setHeaderImagePreview(user.headerImage || '');

    if (profileImageRef.current) profileImageRef.current.value = '';
    if (headerImageRef.current) headerImageRef.current.value = '';
  }, [user]);

  const handleGenreToggle = useCallback((genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const onProfileImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (l) => {
      setProfileImagePreview(l.currentTarget.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const onHeaderImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (l) => {
      setHeaderImagePreview(l.currentTarget.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setIsSaving(true);

        const formData = new FormData();
        formData.append('userType', userTypeRef.current.value);
        formData.append('username', usernameRef.current.value);
        formData.append('name', nameRef.current.value);
        formData.append('bio', bioRef.current.value);
        formData.append('hometown', hometownRef.current.value);

        formData.append('website', websiteRef.current.value);
        formData.append('spotify', spotifyRef.current.value);
        formData.append('itunes', itunesRef.current.value);
        formData.append('instagram', instagramRef.current.value);
        formData.append('twitter', twitterRef.current.value);
        formData.append('tiktok', tiktokRef.current.value);
        formData.append('youtube', youtubeRef.current.value);

        formData.append('genres', JSON.stringify(selectedGenres));

        if (profileImageRef.current.files?.[0]) {
          formData.append('profileImage', profileImageRef.current.files[0]);
        }
        if (headerImageRef.current.files?.[0]) {
          formData.append('headerImage', headerImageRef.current.files[0]);
        }

        const response = await fetcher('/api/user', {
          method: 'PATCH',
          body: formData,
        });
        mutate({ user: response.user }, false);
        toast.success('Profile updated!');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedGenres, mutate]
  );

  const onCancel = () => {
    toast('Changes canceled (not actually implemented).');
  };

  return (
    <div className={styles.card}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 className={styles.title}>Your Profile</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Please update your profile settings here
        </p>
      </div>

      <form onSubmit={onSubmit}>
        {/* Profile Picture + Header */}
        <div
          className={styles.formGroup}
          style={{ display: 'flex', gap: '2rem' }}
        >
          <div>
            <label className={styles.label}>Profile Picture</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={profileImagePreview || '/default-avatar.png'}
                alt="Profile"
                className={styles.profilePic}
              />
              <div>
                <label
                  htmlFor="profileImageInput"
                  className={styles.btnSecondary}
                >
                  Edit
                </label>
                <input
                  id="profileImageInput"
                  type="file"
                  accept="image/*"
                  ref={profileImageRef}
                  onChange={onProfileImageChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={styles.label}>Header Image</label>
            {headerImagePreview ? (
              <img
                src={headerImagePreview}
                alt="Header Preview"
                className={styles.headerImage}
              />
            ) : (
              <p style={{ color: '#999' }}>No header image selected</p>
            )}
            <div style={{ marginTop: '0.5rem' }}>
              <label htmlFor="headerImageInput" className={styles.btnSecondary}>
                Change
              </label>
              <input
                id="headerImageInput"
                type="file"
                accept="image/*"
                ref={headerImageRef}
                onChange={onHeaderImageChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className={styles.formGroup}>
          <label className={styles.label}>I am a</label>
          <select
            ref={userTypeRef}
            className={`${styles.input} ${styles.select}`}
          >
            <option>Music Fan</option>
            <option>Artist</option>
            <option>Producer</option>
            <option>DJ</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Name</label>
          <input
            type="text"
            ref={nameRef}
            className={styles.input}
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Hometown (City, State)</label>
          <input
            type="text"
            ref={hometownRef}
            className={styles.input}
            placeholder="e.g. Los Angeles, CA"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Username</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ color: '#666' }}>@</span>
            <input
              type="text"
              ref={usernameRef}
              className={styles.input}
              placeholder="yourusername"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Bio</label>
          <textarea
            ref={bioRef}
            rows={3}
            className={`${styles.input} ${styles.textarea}`}
            placeholder="Tell us a little about yourself"
          />
        </div>

        {/* Genres */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Preferred Genres</label>
          <div className={styles.genreList}>
            {ALL_GENRES.map((genre) => {
              const selected = selectedGenres.includes(genre);
              return (
                <div
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`${styles.genreItem} ${
                    selected ? styles.genreItemSelected : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyPress={() => handleGenreToggle(genre)}
                >
                  {genre}
                </div>
              );
            })}
          </div>
        </div>

        {/* Social Links */}
        <div style={{ marginTop: '2rem' }}>
          <h3 className={styles.title} style={{ fontSize: '1rem' }}>
            Social Links
          </h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>Website</label>
            <input
              type="text"
              ref={websiteRef}
              className={styles.input}
              placeholder="https://example.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Spotify</label>
            <input
              type="text"
              ref={spotifyRef}
              className={styles.input}
              placeholder="https://spotify.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>iTunes</label>
            <input
              type="text"
              ref={itunesRef}
              className={styles.input}
              placeholder="https://music.apple.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Instagram</label>
            <input
              type="text"
              ref={instagramRef}
              className={styles.input}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Twitter</label>
            <input
              type="text"
              ref={twitterRef}
              className={styles.input}
              placeholder="https://twitter.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>TikTok</label>
            <input
              type="text"
              ref={tiktokRef}
              className={styles.input}
              placeholder="https://tiktok.com/@..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>YouTube</label>
            <input
              type="text"
              ref={youtubeRef}
              className={styles.input}
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>

        {/* Connect Spotify */}
        <div style={{ marginTop: '1rem' }}>
          <ConnectSpotify />
        </div>
        <div style={{ marginTop: '1rem' }} />
        <ConnectAudius user={user} />
        {/* Form Actions */}
        <div className={styles.actions}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const { data, error, mutate } = useCurrentUser();

  useEffect(() => {
    if (!data && !error) return;
    if (!data?.user) {
      router.replace('/login');
    }
  }, [data, error, router]);

  if (!data?.user) {
    return null;
  }

  const user = data.user;

  return (
    <div className={styles.settingsContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.subheading}>Manage your account preferences</p>
        </div>
      </header>

      <AboutYou user={user} mutate={mutate} />
    </div>
  );
}
