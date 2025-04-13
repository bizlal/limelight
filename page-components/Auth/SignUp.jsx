import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import firebase from '@/lib/firebase-client';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Container, Spacer, Wrapper } from '@/components/Layout';
import { TextLink } from '@/components/Text';
import Link from 'next/link';
import styles from './Auth.module.css';

const USER_TYPE_OPTIONS = [
  { value: 'fan', label: 'Music Fan' },
  { value: 'artist', label: 'Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'dj', label: 'DJ' },
  { value: 'label', label: 'Label' },
];

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

export default function SignUp() {
  const router = useRouter();
  const nameRef = useRef();
  const hometownRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();

  const [userType, setUserType] = useState('fan');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Username state and validation
  const [username, setUsername] = useState('@'); // starts with '@'
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'

  const handleUsernameChange = (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('@')) {
      val = '@' + val.replace(/^@+/, '');
    }
    setUsername(val);
    setUsernameStatus(null);
  };

  const handleUsernameBlur = useCallback(async () => {
    const pattern = /^@[A-Za-z0-9_]+$/;
    if (!pattern.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    try {
      setUsernameStatus('checking');
      const encoded = encodeURIComponent(username.slice(1));
      const data = await fetch(
        `/api/users/username-check?username=${encoded}`
      ).then((res) => res.json());
      if (data.available) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch (err) {
      console.error(err);
      setUsernameStatus('taken');
    }
  }, [username]);

  const handleGenreToggle = useCallback((genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (usernameStatus === 'invalid' || usernameStatus === 'taken') {
        toast.error('Please select a valid, available username');
        return;
      }
      setIsLoading(true);
      try {
        // Create user using Firebase Auth.
        const result = await firebase
          .auth()
          .createUserWithEmailAndPassword(
            emailRef.current.value,
            passwordRef.current.value
          );
        if (result.user) {
          // Update the display name if needed.
          await result.user.updateProfile({
            displayName: nameRef.current.value,
          });
          // Upsert additional user info in your database via your API.
          const sanitizedUsername = username.replace(/^@+/, '');
          const bodyData = {
            uid: result.user.uid,
            userType,
            name: nameRef.current.value,
            hometown: hometownRef.current.value,
            username: sanitizedUsername,
            genres: selectedGenres,
          };
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });
          toast.success('Your account has been created!');
          router.replace('/settings');
        }
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [username, usernameStatus, userType, selectedGenres, router]
  );

  return (
    <Wrapper className={styles.root}>
      <div className={styles.main}>
        <h1 className={styles.title}>Welcome to Limelight</h1>
        <form onSubmit={onSubmit} className={styles.formCard}>
          <Container alignItems="center">
            <p className={styles.subtitle}>About you</p>
            <div className={styles.seperator} />
          </Container>
          <Spacer size={0.5} axis="vertical" />

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

          <Input
            ref={emailRef}
            placeholder="Email Address"
            aria-label="Email Address"
            size="large"
            required
          />
          <Spacer size={1} axis="vertical" />
          <Input
            ref={passwordRef}
            placeholder="Password"
            aria-label="Password"
            type="password"
            size="large"
            required
          />
          <Spacer size={1} axis="vertical" />

          <Input
            ref={nameRef}
            placeholder="Your Name"
            aria-label="Your Name or Stage Name"
            size="large"
            required
          />
          <Spacer size={1} axis="vertical" />

          <Input
            ref={hometownRef}
            placeholder="Hometown (City, State)"
            aria-label="Hometown"
            size="large"
          />
          <Spacer size={1} axis="vertical" />

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
                Only letters, numbers &amp; underscores are allowed.
              </small>
            )}
          </label>
          <Spacer size={1} axis="vertical" />

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
