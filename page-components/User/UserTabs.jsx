// /page-components/User/UserTabs.jsx
import React from 'react';
import styles from './UserTabs.module.css';

const tabs = [
  { id: 'collectibles', label: 'Recently Played' },
  { id: 'posts', label: 'Posts' },

  { id: 'repost', label: 'Reposts' },
  { id: 'likes', label: 'Likes' },
];

export default function UserTabs({ activeTab, setActiveTab }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`${styles.tabButton} ${
            activeTab === t.id ? styles.active : ''
          }`}
          onClick={() => setActiveTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
