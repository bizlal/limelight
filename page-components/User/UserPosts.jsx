// /page-components/User/UserPosts.jsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container, Spacer, Wrapper } from '@/components/Layout';
import { Post } from '@/components/Post';
import { Text } from '@/components/Text';
import { usePostPages } from '@/lib/post'; // hypothetical pagination hook
import styles from './UserPosts.module.css';

const UserPosts = ({ user }) => {
  // We assume you have a custom pagination hook for fetching posts
  const { data, size, setSize, isLoadingMore, isReachingEnd } = usePostPages({
    uid: user._id,
  });
  const posts = data
    ? data.reduce((acc, val) => [...acc, ...val.posts], [])
    : [];

  return (
    <div className={styles.root}>
      <Spacer axis="vertical" size={1} />
      <Wrapper>
        {posts.map((post) => (
          <Link
            legacyBehavior
            key={post._id}
            href={`/user/${post.creator.username}/post/${post._id}`}
          >
            <a className={styles.wrap}>
              <Post className={styles.post} post={post} />
            </a>
          </Link>
        ))}

        <Container justifyContent="center">
          {isReachingEnd ? (
            <Text color="secondary">No more posts found</Text>
          ) : (
            <Button
              variant="ghost"
              type="success"
              loading={isLoadingMore}
              onClick={() => setSize(size + 1)}
            >
              Load more
            </Button>
          )}
        </Container>
      </Wrapper>
    </div>
  );
};

export default UserPosts;
