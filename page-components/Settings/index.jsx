import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input, Textarea } from '@/components/Input';
import { Container, Spacer } from '@/components/Layout';
import Wrapper from '@/components/Layout/Wrapper';
import { fetcher } from '@/lib/fetch';
import { useCurrentUser } from '@/lib/user';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './Settings.module.css';

const EmailVerify = ({ user }) => {
  const [status, setStatus] = useState('');
  const verify = useCallback(async () => {
    try {
      setStatus('loading');
      await fetcher('/api/user/email/verify', { method: 'POST' });
      toast.success(
        'An email has been sent to your mailbox. Follow the instructions to verify your email.'
      );
      setStatus('success');
    } catch (e) {
      toast.error(e.message);
      setStatus('');
    }
  }, []);

  if (user.emailVerified) return null;

  return (
    <Container className={styles.note}>
      <Container flex={1}>
        <p>
          <strong>Note:</strong> <span>Your email</span> (
          <span className={styles.link}>{user.email}</span>) is unverified.
        </p>
      </Container>
      <Spacer size={1} axis="horizontal" />
      <Button
        loading={status === 'loading'}
        size="small"
        onClick={verify}
        disabled={status === 'success'}
      >
        Verify
      </Button>
    </Container>
  );
};

const Auth = () => {
  const oldPasswordRef = useRef();
  const newPasswordRef = useRef();

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
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
      oldPasswordRef.current.value = '';
      newPasswordRef.current.value = '';
    }
  }, []);

  return (
    <section className={styles.card}>
      <h4 className={styles.sectionTitle}>Password</h4>
      <form onSubmit={onSubmit}>
        <Input
          htmlType="password"
          autoComplete="current-password"
          ref={oldPasswordRef}
          label="Old Password"
        />
        <Spacer size={0.5} axis="vertical" />
        <Input
          htmlType="password"
          autoComplete="new-password"
          ref={newPasswordRef}
          label="New Password"
        />
        <Spacer size={0.5} axis="vertical" />
        <Button
          htmlType="submit"
          className={styles.submit}
          type="success"
          loading={isLoading}
        >
          Save
        </Button>
      </form>
    </section>
  );
};

const AboutYou = ({ user, mutate }) => {
  // Refs for existing user fields
  const usernameRef = useRef();
  const nameRef = useRef();
  const bioRef = useRef();
  const profilePictureRef = useRef();

  // --- New fields ---
  const websiteRef = useRef();
  const twitterRef = useRef();
  const githubRef = useRef();
  const linkedinRef = useRef();

  // Location refs
  const cityRef = useRef();
  const stateRef = useRef();
  const countryRef = useRef();

  // For previewing avatar
  const [avatarHref, setAvatarHref] = useState(user.profilePicture);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Handle avatar changes
  const onAvatarChange = useCallback((e) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (l) => {
      setAvatarHref(l.currentTarget.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Fetch location from IP (example: using a custom /api/location endpoint).
  // Modify this to match however you retrieve geo-data from IP.
  useEffect(() => {
    async function fetchLocation() {
      try {
        // If user already has location saved, you might skip or override.
        if (user.city || user.state || user.country) {
          return; // Use the existing user location if it exists
        }
        const res = await fetch('/api/location');
        if (!res.ok) throw new Error('Unable to fetch location from IP');
        const data = await res.json();
        // Fill out the location fields automatically
        if (cityRef.current) cityRef.current.value = data.city || '';
        if (stateRef.current) stateRef.current.value = data.state || '';
        if (countryRef.current)
          countryRef.current.value = data.countryCode || '';
      } catch (err) {
        console.error(err);
      }
    }
    fetchLocation();
  }, [user.city, user.state, user.country]);

  // Populate fields with existing user data when the component mounts
  useEffect(() => {
    usernameRef.current.value = user.username || '';
    nameRef.current.value = user.name || '';
    bioRef.current.value = user.bio || '';
    websiteRef.current.value = user.website || '';
    twitterRef.current.value = user.social?.twitter || '';
    githubRef.current.value = user.social?.github || '';
    linkedinRef.current.value = user.social?.linkedin || '';
    cityRef.current.value = user.city || '';
    stateRef.current.value = user.state || '';
    countryRef.current.value = user.country || '';
    setAvatarHref(user.profilePicture);
    // Clear out the file input
    if (profilePictureRef.current) {
      profilePictureRef.current.value = '';
    }
  }, [user]);

  // Handle form submission
  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('username', usernameRef.current.value);
        formData.append('name', nameRef.current.value);
        formData.append('bio', bioRef.current.value);

        // New fields
        formData.append('website', websiteRef.current.value);
        formData.append('twitter', twitterRef.current.value);
        formData.append('github', githubRef.current.value);
        formData.append('linkedin', linkedinRef.current.value);

        // Location fields
        formData.append('city', cityRef.current.value);
        formData.append('state', stateRef.current.value);
        formData.append('country', countryRef.current.value);

        if (profilePictureRef.current.files[0]) {
          formData.append('profilePicture', profilePictureRef.current.files[0]);
        }

        const response = await fetcher('/api/user', {
          method: 'PATCH',
          body: formData,
        });
        mutate({ user: response.user }, false);
        toast.success('Your profile has been updated');
      } catch (e) {
        toast.error(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [mutate]
  );

  return (
    <section className={styles.card}>
      <h4 className={styles.sectionTitle}>About You</h4>
      <form onSubmit={onSubmit}>
        <Input ref={usernameRef} label="Your Username" />
        <Spacer size={0.5} axis="vertical" />
        <Input ref={nameRef} label="Your Name" />
        <Spacer size={0.5} axis="vertical" />
        <Textarea ref={bioRef} label="Your Bio" />
        <Spacer size={0.5} axis="vertical" />

        {/* Website */}
        <Input
          ref={websiteRef}
          label="Your Website"
          placeholder="https://example.com"
        />
        <Spacer size={0.5} axis="vertical" />

        {/* Social Links */}
        <Input ref={twitterRef} label="Twitter" placeholder="@yourhandle" />
        <Spacer size={0.5} axis="vertical" />
        <Input
          ref={githubRef}
          label="GitHub"
          placeholder="github.com/yourprofile"
        />
        <Spacer size={0.5} axis="vertical" />
        <Input
          ref={linkedinRef}
          label="LinkedIn"
          placeholder="linkedin.com/in/yourprofile"
        />
        <Spacer size={0.5} axis="vertical" />

        {/* Location Fields */}
        <Input ref={cityRef} label="City" placeholder="e.g. San Francisco" />
        <Spacer size={0.5} axis="vertical" />
        <Input
          ref={stateRef}
          label="State/Province"
          placeholder="e.g. California"
        />
        <Spacer size={0.5} axis="vertical" />
        <label className={styles.label}>Country</label>
        <select ref={countryRef} defaultValue="">
          <option value="">-- Select Country --</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          {/* Add more countries or use a library for a full list */}
        </select>
        <Spacer size={0.5} axis="vertical" />

        <span className={styles.label}>Your Avatar</span>
        <div className={styles.avatar}>
          <Avatar size={96} username={user.username} url={avatarHref} />
          <input
            aria-label="Your Avatar"
            type="file"
            accept="image/*"
            ref={profilePictureRef}
            onChange={onAvatarChange}
          />
        </div>

        <Spacer size={0.5} axis="vertical" />
        <Button
          htmlType="submit"
          className={styles.submit}
          type="success"
          loading={isLoading}
        >
          Save
        </Button>
      </form>
    </section>
  );
};

export const Settings = () => {
  const { data, error, mutate } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    // If user is not logged in, redirect
    if (!data && !error) return;
    if (!data?.user) {
      router.replace('/login');
    }
  }, [router, data, error]);

  return (
    <Wrapper className={styles.wrapper}>
      <Spacer size={2} axis="vertical" />
      {data?.user ? (
        <>
          <EmailVerify user={data.user} />
          <AboutYou user={data.user} mutate={mutate} />
          <Auth user={data.user} />
        </>
      ) : null}
    </Wrapper>
  );
};
