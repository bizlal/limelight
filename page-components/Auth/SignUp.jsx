// pages/sign-up.js
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Container, Spacer, Wrapper } from '@/components/Layout';
import { TextLink } from '@/components/Text';
import { fetcher } from '@/lib/fetch';
import { useCurrentUser } from '@/lib/user';
import Link from 'next/link';

import styles from './Auth.module.css';

const USER_TYPE_OPTIONS = [
  { value: 'fan', label: 'Music Fan' },
  { value: 'artist', label: 'Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'dj', label: 'DJ' },
  { value: 'label', label: 'Label' },
];

// Example list of genres
const GENRE_OPTIONS = [
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

// ... user type and genre arrays as before ...

export default function SignUp() {
  const router = useRouter();
  const { mutate } = useCurrentUser();

  const nameRef = useRef();
  const hometownRef = useRef();

  // Local states
  const [userType, setUserType] = useState('fan');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --------------------------------------
  // 1. Username State & Validation
  // --------------------------------------
  const [username, setUsername] = useState('@'); // Start with '@'
  const [usernameStatus, setUsernameStatus] = useState(null);
  // null | 'checking' | 'available' | 'taken' | 'invalid'

  const handleUsernameChange = (e) => {
    let val = e.target.value.trim();
    // Ensure it starts with '@'
    if (!val.startsWith('@')) {
      val = '@' + val.replace(/^@+/, '');
    }
    setUsername(val);
    setUsernameStatus(null); // reset status while typing
  };

  const handleUsernameBlur = useCallback(async () => {
    // Basic pattern check: only letters, numbers, underscores after '@'
    // Adjust to your own rules
    const pattern = /^@[A-Za-z0-9_]+$/;
    if (!pattern.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    // If it passes local validation, check availability from server
    try {
      setUsernameStatus('checking');
      const encoded = encodeURIComponent(username.slice(1)); // strip the '@'
      // Example GET route: /api/users/username-check?username=someUser
      const data = await fetcher(
        `/api/users/username-check?username=${encoded}`
      );
      if (data.available) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch (err) {
      // If anything fails, treat as 'taken' or handle error
      console.error(err);
      setUsernameStatus('taken');
    }
  }, [username]);

  // --------------------------------------
  // 2. Genre Toggle
  // --------------------------------------
  const handleGenreToggle = useCallback((genre) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  }, []);

  // --------------------------------------
  // 3. Submission
  // --------------------------------------
  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // If username is invalid or taken, prevent form submission
      if (usernameStatus === 'invalid' || usernameStatus === 'taken') {
        toast.error('Please select a valid, available username');
        return;
      }

      try {
        setIsLoading(true);
        // Note: strip the "@" before sending to your backend
        const sanitizedUsername = username.replace(/^@+/, '');

        const bodyData = {
          userType,
          name: nameRef.current.value,
          hometown: hometownRef.current.value,
          username: sanitizedUsername,
          genres: selectedGenres,
        };

        const response = await fetcher('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        mutate({ user: response.user }, false);
        toast.success('Your account details have been updated!');
        router.replace('/settings');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [username, usernameStatus, userType, selectedGenres, mutate, router]
  );

  return (
    <Wrapper className={styles.root}>
      <div className={styles.main}>
        <h1 className={styles.title}>Welcome to Limelight</h1>
        <form onSubmit={onSubmit} className={styles.formCard}>
          {/* ABOUT YOU */}
          <Container alignItems="center">
            <p className={styles.subtitle}>About you</p>
            <div className={styles.seperator} />
          </Container>
          <Spacer size={0.5} axis="vertical" />

          {/* User Type */}
          <label className={styles.label}>
            I am a:
            <select
              className={styles.select}
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
            >
              {USER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Spacer size={1} axis="vertical" />

          {/* Name */}
          <Input
            ref={nameRef}
            placeholder="Your Name"
            aria-label="Your Name or Stage Name"
            size="large"
            required
          />
          <Spacer size={1} axis="vertical" />

          {/* Hometown */}
          <Input
            ref={hometownRef}
            placeholder="Hometown (City, State)"
            aria-label="Hometown"
            size="large"
          />
          <Spacer size={1} axis="vertical" />

          {/* Username with "@" prefix */}
          <label className={styles.label}>
            Username
            <input
              type="text"
              className={`${styles.input} ${styles.usernameInput}`}
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              placeholder="@yourhandle"
              required
            />
            {usernameStatus === 'checking' && (
              <small style={{ color: '#ccc' }}>Checking...</small>
            )}
            {usernameStatus === 'available' && (
              <small style={{ color: 'lightgreen' }}>
                Great! That username is available.
              </small>
            )}
            {usernameStatus === 'taken' && (
              <small style={{ color: 'tomato' }}>
                Sorry, that username is already taken.
              </small>
            )}
            {usernameStatus === 'invalid' && (
              <small style={{ color: 'tomato' }}>
                Only letters, numbers & underscores are allowed.
              </small>
            )}
          </label>
          <Spacer size={1} axis="vertical" />

          {/* Genre Pills */}
          <label className={styles.label}>Preferred Genres:</label>
          <div className={styles.genresGrid}>
            {GENRE_OPTIONS.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <div
                  key={genre}
                  className={`${styles.genrePill} ${
                    isSelected ? styles.selected : ''
                  }`}
                  onClick={() => handleGenreToggle(genre)}
                  role="button"
                  tabIndex={0}
                >
                  {genre}
                </div>
              );
            })}
          </div>
          <Spacer size={1} axis="vertical" />

          {/* Submit Button */}
          <Button
            htmlType="submit"
            className={`${styles.submit} ${styles.gradientBtn}`}
            size="large"
            loading={isLoading}
          >
            Sign up
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Link href="/login" passHref legacyBehavior>
          <TextLink color="link" variant="highlight">
            Already have an account? Log in
          </TextLink>
        </Link>
      </div>
    </Wrapper>
  );
}
