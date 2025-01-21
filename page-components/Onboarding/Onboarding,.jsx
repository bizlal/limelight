// pages/onboarding.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import { useCurrentUser } from '@/lib/user';
import { fetcher } from '@/lib/fetch';

import { Wrapper, Container, Spacer } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

import styles from './Onboarding.module.css';

export const Onboarding = () => {
  const router = useRouter();
  const { data: { user } = {}, mutate } = useCurrentUser();

  // If you don't have user data yet, you might redirect or show a loading state.
  useEffect(() => {
    if (!user) {
      // e.g. if not logged in, redirect to login
      // or if user is null, we wait
    }
  }, [user]);

  // We assume `user.userType` was set at sign-up: 'fan', 'artist', 'producer', 'dj', 'label'
  const userType = user?.userType || 'fan';

  // States for each onboarding field
  const [bio, setBio] = useState('');
  const [homeTown, setHomeTown] = useState('');
  const [profilePicture, setProfilePicture] = useState(null); // file object

  // Music fan fields
  const [favoriteGenres, setFavoriteGenres] = useState('');

  // Artist fields
  const [monthlyListeners, setMonthlyListeners] = useState('');
  const [distributionInterest, setDistributionInterest] = useState('no');
  const [wantsArtistToken, setWantsArtistToken] = useState('no');
  const [walletAddress, setWalletAddress] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);

  // Profile image preview
  const [previewURL, setPreviewURL] = useState(null);

  // If user wants to upload a profile pic, handle changes
  const onFileChange = (e) => {
    const file = e.target.files[0];
    setProfilePicture(file);
    if (file) {
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  // Example simulated on-chain payment
  const handlePayment = async () => {
    setIsPaying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setHasPaid(true);
      toast.success(
        'Transaction confirmed! You’re whitelisted for Artist Token.'
      );
    } catch (err) {
      toast.error('Transaction failed.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    // If they want an artist token, require payment first
    if (userType !== 'fan' && wantsArtistToken === 'yes' && !hasPaid) {
      toast.error(
        'Please complete the 0.05 ETH payment first to be whitelisted.'
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append('bio', bio);
      formData.append('homeTown', homeTown);

      // Add fan field
      if (userType === 'fan') {
        formData.append('favoriteGenres', favoriteGenres);
      } else {
        // Add artist fields
        formData.append('monthlyListeners', monthlyListeners);
        formData.append('distributionInterest', distributionInterest);
        formData.append('wantsArtistToken', wantsArtistToken);
        formData.append('walletAddress', walletAddress);
        formData.append('hasPaidForToken', hasPaid.toString());
      }

      // If user uploaded a profile pic
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      // Example: POST to /api/user/onboarding or /api/users with multipart form
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error saving onboarding info.');
      }
      const data = await response.json();

      // Optionally update local user context with the new data
      mutate({ user: data.user }, false);

      toast.success('Onboarding complete!');
      router.replace('/feed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Wrapper className={styles.onboardingWrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Complete Your Profile</h1>

        <p className={styles.subtitle}>
          Welcome{user?.name ? `, ${user.name}` : ''}! Let’s finalize your
          profile.
        </p>
        <Spacer size={1} axis="vertical" />

        {/* Bio */}
        <label className={styles.label}>
          Your Bio
          <textarea
            className={styles.textarea}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
          />
        </label>
        <Spacer size={0.5} axis="vertical" />

        {/* Home Town */}
        <label className={styles.label}>
          Home Town
          <Input
            value={homeTown}
            onChange={(e) => setHomeTown(e.target.value)}
            placeholder="e.g. London, Chicago"
            size="large"
          />
        </label>
        <Spacer size={0.5} axis="vertical" />

        {/* Profile Picture */}
        <label className={styles.label}>
          Profile Picture
          {previewURL && (
            <img
              src={previewURL}
              alt="Profile preview"
              className={styles.previewImg}
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className={styles.fileInput}
          />
        </label>
        <Spacer size={1} axis="vertical" />

        {/* Conditionals for userType */}
        {userType === 'fan' ? (
          <>
            <label className={styles.label}>
              Favorite Genres
              <Input
                value={favoriteGenres}
                onChange={(e) => setFavoriteGenres(e.target.value)}
                placeholder="e.g. Hip-Hop, EDM, Rock"
                size="large"
              />
            </label>
          </>
        ) : (
          <>
            <label className={styles.label}>
              Monthly Listeners
              <Input
                value={monthlyListeners}
                onChange={(e) => setMonthlyListeners(e.target.value)}
                placeholder="e.g. 1,000 monthly listeners"
                size="large"
              />
            </label>
            <Spacer size={0.5} axis="vertical" />

            <label className={styles.label}>
              Interested in Distribution?
              <select
                className={styles.select}
                value={distributionInterest}
                onChange={(e) => setDistributionInterest(e.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <Spacer size={0.5} axis="vertical" />

            <label className={styles.label}>
              Create an Artist Token?
              <select
                className={styles.select}
                value={wantsArtistToken}
                onChange={(e) => setWantsArtistToken(e.target.value)}
              >
                <option value="no">No</option>
                <option value="yes">Yes (0.05 ETH Whitelist)</option>
              </select>
            </label>

            {wantsArtistToken === 'yes' && (
              <>
                <Spacer size={0.5} axis="vertical" />
                <label className={styles.label}>
                  Wallet Address
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0xYourWalletAddress"
                    size="large"
                  />
                </label>
                <Spacer size={0.5} axis="vertical" />

                {!hasPaid ? (
                  <div className={styles.paymentSection}>
                    <p>
                      Whitelist Price: <strong>0.05 ETH</strong>
                    </p>
                    <Button
                      type="success"
                      size="medium"
                      disabled={isPaying}
                      onClick={handlePayment}
                    >
                      {isPaying ? 'Processing...' : 'Pay 0.05 ETH'}
                    </Button>
                  </div>
                ) : (
                  <p className={styles.whitelistConfirmed}>
                    ✅ Payment confirmed! You’re whitelisted.
                  </p>
                )}
              </>
            )}
          </>
        )}

        <Spacer size={1} axis="vertical" />
        <Button type="success" size="large" onClick={handleOnboardingSubmit}>
          Finish Onboarding
        </Button>
      </div>
    </Wrapper>
  );
};
