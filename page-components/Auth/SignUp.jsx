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

/**
 * Choose from 5 possible user types.
 */
const USER_TYPE_OPTIONS = [
  { value: 'fan', label: 'Music Fan' },
  { value: 'artist', label: 'Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'dj', label: 'DJ' },
  { value: 'label', label: 'Label' },
];

export default function SignUp() {
  const router = useRouter();
  const { mutate } = useCurrentUser();

  // Refs for minimal fields
  const userTypeRef = useRef();
  const nameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();

  const [userType, setUserType] = useState('fan');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setIsLoading(true);

        const bodyData = {
          userType,
          name: nameRef.current.value,
          email: emailRef.current.value,
          password: passwordRef.current.value,
        };

        const response = await fetcher('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        // Update user context so the app knows they're logged in
        mutate({ user: response.user }, false);
        toast.success('Your account has been created!');

        // Route to onboarding for more info
        router.replace('/onboarding');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [userType, mutate, router]
  );

  return (
    <Wrapper className={styles.root}>
      <div className={styles.main}>
        <h1 className={styles.title}>Join Now</h1>
        <form onSubmit={onSubmit} className={styles.formCard}>
          {/* ABOUT YOU */}
          <Container alignItems="center">
            <p className={styles.subtitle}>About you</p>
            <div className={styles.seperator} />
          </Container>
          <Spacer size={0.5} axis="vertical" />
          {/* User Type FIRST */}
          <label className={styles.label}>
            I am a:
            <select
              ref={userTypeRef}
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


          <Input
            ref={nameRef}
            autoComplete="name"
            placeholder="Your Name"
            aria-label="Your Name or Stage Name"
            size="large"
            required
          />

          <Spacer size={1} axis="vertical" />

          {/* YOUR LOGIN */}
          <Container alignItems="center">
            <p className={styles.subtitle}>Your login</p>
            <div className={styles.seperator} />
          </Container>
          <Spacer size={0.5} axis="vertical" />
          <Input
            ref={emailRef}
            type="email"
            autoComplete="email"
            placeholder="Email Address"
            aria-label="Email Address"
            size="large"
            required
          />
          <Spacer size={0.5} axis="vertical" />
          <Input
            ref={passwordRef}
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            aria-label="Password"
            size="large"
            required
          />
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
        <Link legacyBehavior href="/login" passHref>
          <TextLink color="link" variant="highlight">
            Already have an account? Log in
          </TextLink>
        </Link>
      </div>
    </Wrapper>
  );
}
