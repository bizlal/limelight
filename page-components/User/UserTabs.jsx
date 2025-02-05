// /page-components/User/UserTabs.jsx
import React from "react";
import styles from "./UserTabs.module.css";

const tabs = [
  { id: "posts", label: "Posts" },
  { id: "collectibles", label: "Collectibles" },
  { id: "repost", label: "Reposts" },
  { id: "likes", label: "Likes" },
];

export default function UserTabs({ activeTab, setActiveTab }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`${styles.tabButton} ${
            activeTab === t.id ? styles.active : ""
          }`}
          onClick={() => setActiveTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
