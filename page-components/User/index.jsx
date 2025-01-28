// /page-components/User/index.jsx
import React, { useState } from 'react';
import UserHeader from './UserHeader';
import UserTabs from './UserTabs';
import Poster from '../Feed/Poster';
import UserPosts from './UserPosts';

import styles from './User.module.css';
import { useCurrentUser as currentUser } from '@/lib/user';

export const User = ({ user }) => {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div className={styles.root}>
      {/* 1) The header (cover + user stats, etc.) */}
      <UserHeader user={user} currentUser={currentUser} />

      {/* 2) The tab bar (gradient) */}
      <UserTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 3) Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'posts' && (
          <div className={styles.overviewTab}>
            {/* Poster: user can create a post on the user’s wall */}
            <div className={styles.posterContainer}>
              <Poster />
            </div>
            {/* Show user’s posts below */}
            <UserPosts user={user} />
          </div>
        )}
        {activeTab === 'collectibles' && (
          <div className={styles.placeholderBox}>
            <h3>Collectibles</h3>
            <p>Display user’s NFTs or collectible items here.</p>
          </div>
        )}
        {activeTab === 'repost' && (
          <div className={styles.placeholderBox}>
            <h3>Reposts</h3>
            <p>Show reposted tracks/posts from other users here.</p>
          </div>
        )}
        {activeTab === 'likes' && (
          <div className={styles.placeholderBox}>
            <h3>Likes</h3>
            <p>Show user’s liked tracks/posts here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default User;
