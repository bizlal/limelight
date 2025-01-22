// /page-components/Settings/Settings.js
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

import { fetcher } from '@/lib/fetch';
import { useCurrentUser } from '@/lib/user';
import styles from './Settings.module.css';

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

/** If you have an email verification note */
function EmailVerify({ user }) {
  const [status, setStatus] = useState('');

  const verify = useCallback(async () => {
    try {
      setStatus('loading');
      await fetcher('/api/user/email/verify', { method: 'POST' });
      toast.success('An email has been sent to your mailbox. Please verify.');
      setStatus('success');
    } catch (e) {
      toast.error(e.message);
      setStatus('');
    }
  }, []);

  if (user?.emailVerified) return null;

  return (
    <div className={styles.note}>
      <p>
        <strong>Note:</strong> Your email
        <span className={styles.link}>{user?.email}</span> is unverified.
      </p>
      <button
        onClick={verify}
        disabled={status === 'loading' || status === 'success'}
        style={{ marginLeft: 'auto' }}
      >
        Verify
      </button>
    </div>
  );
}

/** If you still allow password changes (legacy local auth) */
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
    <div className={styles.formCard} style={{ marginTop: '1rem' }}>
      <h2 className={styles.subtitle}>Password</h2>
      <form onSubmit={onSubmit}>
        <label className={styles.label}>
          Old Password
          <input
            type="password"
            ref={oldPasswordRef}
            className={styles.input}
            placeholder="••••••"
          />
        </label>

        <label className={styles.label}>
          New Password
          <input
            type="password"
            ref={newPasswordRef}
            className={styles.input}
            placeholder="••••••"
          />
        </label>

        <button
          type="submit"
          className={`${styles.submit} ${styles.gradientBtn}`}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

/** Main "About You" form */
function AboutYou({ user, mutate }) {
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

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Example: userType if you store "musicFan"/"artist", etc.
    userTypeRef.current.value = user.userType || 'Music Fan';
    usernameRef.current.value = user.username || '';
    nameRef.current.value = user.name || '';
    bioRef.current.value = user.bio || '';
    hometownRef.current.value = user.hometown || '';

    // Social links
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

    // Clear file inputs
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

        // Social links
        formData.append('website', websiteRef.current.value);
        formData.append('spotify', spotifyRef.current.value);
        formData.append('itunes', itunesRef.current.value);
        formData.append('instagram', instagramRef.current.value);
        formData.append('twitter', twitterRef.current.value);
        formData.append('tiktok', tiktokRef.current.value);
        formData.append('youtube', youtubeRef.current.value);

        // Genres
        formData.append('genres', JSON.stringify(selectedGenres));

        // Images
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

  return (
    <div className={styles.formCard}>
      <h2 className={styles.title}>Edit Profile</h2>

      {/* Email verification note (optional) could go here or above */}
      {/* <EmailVerify user={user} /> */}

      <form onSubmit={onSubmit}>
        {/* Profile Image */}
        <label className={styles.label}>
          Profile Image
          <div className={styles.avatarContainer}>
            <img
              className={styles.avatarPreview}
              src={profileImagePreview || '/default-avatar.png'}
              alt="Profile Preview"
            />
            <input
              type="file"
              accept="image/*"
              ref={profileImageRef}
              onChange={onProfileImageChange}
              className={styles.input}
              style={{ padding: '0.3rem' }}
            />
          </div>
        </label>

        {/* Header Image */}
        <label className={styles.label}>
          Header Image
          <div>
            {headerImagePreview ? (
              <img
                src={headerImagePreview}
                alt="Header Preview"
                className={styles.headerPreview}
              />
            ) : (
              <p style={{ color: '#fff', opacity: 0.8 }}>No header image</p>
            )}
            <input
              type="file"
              accept="image/*"
              ref={headerImageRef}
              onChange={onHeaderImageChange}
              className={styles.input}
              style={{ marginTop: '0.5rem', padding: '0.3rem' }}
            />
          </div>
        </label>

        {/* “I am a” select */}
        <label className={styles.label}>
          I am a:
          <select ref={userTypeRef} className={styles.select}>
            <option>Music Fan</option>
            <option>Artist</option>
            <option>Producer</option>
            <option>DJ</option>
          </select>
        </label>

        <label className={styles.label}>
          Your Name
          <input
            type="text"
            ref={nameRef}
            className={styles.input}
            placeholder="e.g. Jane Doe"
          />
        </label>

        <label className={styles.label}>
          Hometown (City, State)
          <input
            type="text"
            ref={hometownRef}
            className={styles.input}
            placeholder="e.g. Los Angeles, CA"
          />
        </label>

        <label className={styles.label}>
          Username
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ color: '#fff' }}>@</span>
            <input
              type="text"
              ref={usernameRef}
              className={styles.input}
              placeholder="username"
              style={{ flex: 1 }}
            />
          </div>
        </label>

        <label className={styles.label}>
          Bio
          <textarea
            ref={bioRef}
            rows={3}
            className={styles.input}
            placeholder="Tell us about yourself"
          />
        </label>

        <label className={styles.label}>Preferred Genres</label>
        <div className={styles.genresGrid}>
          {ALL_GENRES.map((genre) => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <div
                key={genre}
                className={`${styles.genrePill} ${
                  isSelected ? styles.genrePillSelected : ''
                }`}
                onClick={() => handleGenreToggle(genre)}
                onKeyPress={() => handleGenreToggle(genre)}
                role="button"
                tabIndex={0}
              >
                {genre}
              </div>
            );
          })}
        </div>

        {/* Social links */}
        <label className={styles.label}>
          Website
          <input
            type="text"
            ref={websiteRef}
            className={styles.input}
            placeholder="https://example.com"
          />
        </label>
        <label className={styles.label}>
          Spotify
          <input
            type="text"
            ref={spotifyRef}
            className={styles.input}
            placeholder="https://spotify.com/..."
          />
        </label>
        <label className={styles.label}>
          iTunes
          <input
            type="text"
            ref={itunesRef}
            className={styles.input}
            placeholder="https://music.apple.com/..."
          />
        </label>
        <label className={styles.label}>
          Instagram
          <input
            type="text"
            ref={instagramRef}
            className={styles.input}
            placeholder="https://instagram.com/..."
          />
        </label>
        <label className={styles.label}>
          Twitter
          <input
            type="text"
            ref={twitterRef}
            className={styles.input}
            placeholder="https://twitter.com/..."
          />
        </label>
        <label className={styles.label}>
          TikTok
          <input
            type="text"
            ref={tiktokRef}
            className={styles.input}
            placeholder="https://tiktok.com/@..."
          />
        </label>
        <label className={styles.label}>
          YouTube
          <input
            type="text"
            ref={youtubeRef}
            className={styles.input}
            placeholder="https://youtube.com/..."
          />
        </label>

        {/* Submit button */}
        <button
          type="submit"
          className={`${styles.submit} ${styles.gradientBtn}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const { data, error, mutate } = useCurrentUser();

  // If not logged in, redirect or show "please sign in"
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
    <div className={styles.root}>
      <div className={styles.main}>
        {/* Optionally show email verification note at top */}
        <EmailVerify user={user} />

        {/* Main "About You" card */}
        <AboutYou user={user} mutate={mutate} />

        {/* If you still allow password changes, show this “Auth” card */}
        <Auth />
      </div>
    </div>
  );
}
