import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetcher } from '@/lib/fetch';
import { audiusSdk } from './AudiusSDK'; // your local Audius SDK import
import styles from './ConnectAudius.module.css'; // optional styling

/**
 * Example usage:
 * <ConnectAudius user={currentUser} />
 */
export function ConnectAudius({ user }) {
  const buttonDivRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true); // loading while we fetch existing profile or set up OAuth
  const [audiusProfile, setAudiusProfile] = useState(null); // store the user’s Audius profile if connected
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 1) On mount, fetch existing Audius profile from your /api/audius?uid=xxx
    async function loadExistingProfile() {
      try {
        if (!user?.uid) {
          setIsLoading(false);
          return;
        }
        const resp = await fetcher(`/api/audius?uid=${user.uid}`);
        // If found, resp.profile is the stored data
        setAudiusProfile(resp.profile);
      } catch (err) {
        // If 404 or no profile, that's fine => user not connected
        if (err.message !== 'Audius profile not found.') {
          console.error('Error checking existing Audius profile:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadExistingProfile();
  }, [user?.uid]);

  useEffect(() => {
    // 2) Once we know if user is connected or not, if they're not connected, set up OAuth
    if (!isLoading && !audiusProfile && buttonDivRef.current) {
      // Render the "Continue with Audius" button
      // We do this in a separate function to keep useEffect neat
      loadOAuth();
    }
  }, [isLoading, audiusProfile, loadOAuth]);

  // The function that sets up the Audius OAuth flow
  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function loadOAuth() {
    // 1) Initialize
    audiusSdk.oauth.init({
      successCallback: async (profile) => {
        // The user successfully logged in with Audius
        toast.loading('Linking your Audius account...');
        try {
          // 2) POST to /api/audius => upsert in DB
          await fetcher('/api/audius', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              audiusProfile: profile, // store the entire profile object
            }),
          });
          // If successful, store in local state
          setAudiusProfile(profile);
          setErrorMsg('');
          toast.dismiss();
          toast.success(`Audius connected as @${profile.handle}`);
        } catch (err) {
          console.error('Error saving Audius profile:', err);
          setErrorMsg(err.message || 'Failed to link Audius profile');
          toast.dismiss();
          toast.error(err.message || 'Failed to link Audius');
        }
      },
      errorCallback: (err) => {
        console.error('Audius login error:', err);
        setErrorMsg(err);
        toast.error(`Audius login failed: ${err}`);
      },
    });

    // 2) Render the button
    audiusSdk.oauth.renderButton({
      element: buttonDivRef.current,
      scope: 'read',
      buttonOptions: {
        size: 'large',
        corners: 'pill',
        customText: 'Continue with Audius',
      },
    });
  }

  // If still loading data from DB, show a spinner or note
  if (isLoading) {
    return (
      <div className={styles.connectAudiusContainer}>
        <h3 className={styles.title}>Connect with Audius</h3>
        <p className={styles.note}>Loading your Audius status...</p>
      </div>
    );
  }

  // If user is connected
  if (audiusProfile) {
    return (
      <div className={styles.connectAudiusContainer}>
        <h3 className={styles.title}>Audius Connected</h3>
        <p className={styles.note}>
          You are linked as <strong>@{audiusProfile.handle}</strong>
        </p>
        {errorMsg && (
          <p className={styles.note} style={{ color: 'red' }}>
            Error: {errorMsg}
          </p>
        )}
        {/* Possibly a "Disconnect" button if your app supports it */}
      </div>
    );
  }

  // Not connected => show the "Continue with Audius" button plus error if any
  return (
    <div className={styles.connectAudiusContainer}>
      <h3 className={styles.title}>Connect with Audius</h3>
      <p className={styles.note}>
        Link your Audius account to unlock more music features.
      </p>
      {errorMsg && (
        <p className={styles.note} style={{ color: 'red' }}>
          Error: {errorMsg}
        </p>
      )}
      <div ref={buttonDivRef} />
    </div>
  );
}
