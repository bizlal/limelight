// /page-components/User/index.jsx
import React, { useState } from 'react';
import UserHeader from './UserHeader';
import UserTabs from './UserTabs';
import Poster from '../Feed/Poster';
import UserPosts from './UserPosts';

import styles from "./User.module.css";
import { useCurrentUser as currentUser } from "@/lib/user";
import UserRecentlyPlayed from "./UserRecentlyPlayed";

export const User = ({ user }) => {
  // Add 'recentlyPlayed' as one of the possible tabs.
  const [activeTab, setActiveTab] = useState('collectibles');

  return (
    <div className={styles.root}>
      {/* 1) The header (cover + user stats, etc.) */}
      <UserHeader user={user} currentUser={currentUser} />

      {/* 2) The tab bar */}
      <UserTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 3) Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "posts" && (
          <div className={styles.overviewTab}>
            {/* Poster: user can create a post on the user’s wall */}
            <div className={styles.posterContainer}>
              <Poster />
            </div>
            {/* Show user’s posts below */}
            <UserPosts user={user} />
          </div>
        )}
        {activeTab === "collectibles" && (
          <div className={styles.placeholderBox}>
            <UserRecentlyPlayed user={user} />
          </div>
        )}
        {activeTab === "repost" && (
          <div className={styles.placeholderBox}>
            <h3>Reposts</h3>
            <p>Show reposted tracks/posts from other users here.</p>
          </div>
        )}
        {activeTab === "likes" && (
          <div className={styles.placeholderBox}>
            <h3>Likes</h3>
            <p>Show user’s liked tracks/posts here.</p>
          </div>
        )}
        {activeTab === "recentlyPlayed" && (
          <div className={styles.overviewTab}>
            <UserRecentlyPlayed />
          </div>
        )}
      </div>
    </div>
  );
};

export default User;
