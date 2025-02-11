// components/ShareTrack.jsx
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Container, Wrapper } from '@/components/Layout';
import { LoadingDots } from '@/components/LoadingDots';
import { Text, TextLink } from '@/components/Text';
import { fetcher } from '@/lib/fetch';
import { useDiscover } from '@/lib/discover'; // Hook to refresh shared tracks list
import { useCurrentUser } from '@/lib/user';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './ShareTrack.module.css';

const ShareTrackInner = ({ user }) => {
  const urlRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const { mutate } = useDiscover();

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setIsLoading(true);
        await fetcher('/api/share-track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlRef.current.value,
            uid: user.uid,
          }),
        });
        toast.success('Track shared successfully');
        urlRef.current.value = '';
        // Refresh the shared tracks list
        mutate();
      } catch (e) {
        toast.error(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [mutate, user.uid]
  );

  return (
    <form onSubmit={onSubmit}>
      <Container className={styles.shareTrack}>
        <Avatar size={40} username={user.username} url={user.profileImage} />
        <Input
          ref={urlRef}
          className={styles.input}
          placeholder="Paste Spotify track URL here..."
          ariaLabel="Paste Spotify track URL here"
        />
        <Button type="success" loading={isLoading}>
          Share
        </Button>
      </Container>
    </form>
  );
};

const ShareTrack = () => {
  const { data, error } = useCurrentUser();
  const loading = !data && !error;
  const user = data?.user;
  return (
    <Wrapper>
      <div className={styles.root}>
        <h3 className={styles.heading}>Share a Track</h3>
        {loading ? (
          <LoadingDots>Loading</LoadingDots>
        ) : data?.user ? (
          <ShareTrackInner user={user} />
        ) : (
          <Text color="secondary">
            Please{' '}
            <Link href="/login" passHref legacyBehavior>
              <TextLink color="link" variant="highlight">
                sign in
              </TextLink>
            </Link>{' '}
            to share a track
          </Text>
        )}
      </div>
    </Wrapper>
  );
};

export default ShareTrack;
