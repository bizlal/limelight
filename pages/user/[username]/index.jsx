import { findUserByUsername } from '@/api-lib/db';
import { getMongoDb } from '@/api-lib/mongodb';
import { User } from '@/page-components/User';
import Head from 'next/head';

export default function UserPage({ user }) {
  // You can create a short description or fallback if user's bio is empty:
  const userDescription = user.bio
    ? user.bio.slice(0, 160) // typical meta desc limit ~160
    : `View ${user.name} (@${user.username}) on Limelight.`;

  // You can build an Open Graph image if you have a profileImage or a default
  const ogImage = user.profileImage || '/images/default-profile.jpg';

  return (
    <>
      <Head>
        {/* Page Title */}
        <title>
          {user.name} (@{user.username}) | Limelight
        </title>

        {/* Basic Meta Tags */}
        <meta name="description" content={userDescription} />
        <meta
          name="keywords"
          content={`${user.name}, ${user.username}, Limelight, artist, music`}
        />

        {/* Open Graph Meta */}
        <meta
          property="og:title"
          content={`${user.name} (@${user.username}) | Limelight`}
        />
        <meta property="og:description" content={userDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="profile" />
        {/* If you have a canonical domain: */}
        <meta
          property="og:url"
          content={`https://lmlt.ai/user/${user.username}`}
        />

        {/* Twitter Card Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${user.name} (@${user.username}) | Limelight`}
        />
        <meta name="twitter:description" content={userDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      {/* Your existing user component */}
      <User user={user} />
    </>
  );
}

export async function getServerSideProps(context) {
  const db = await getMongoDb();
  const user = await findUserByUsername(db, context.params.username);

  if (!user) {
    return { notFound: true };
  }

  // Clean up fields & ensure no null/undefined
  user.createdAt = user.createdAt
    ? new Date(user.createdAt).toISOString()
    : null;
  user.updatedAt = user.updatedAt
    ? new Date(user.updatedAt).toISOString()
    : null;
  user.username = user.username || '';
  user.name = user.name || '';
  user.userType = user.userType || '';
  user.hometown = user.hometown || '';
  user.profileImage = user.profileImage || '';
  user.headerImage = user.headerImage || '';
  user.genres = user.genres || [];
  user.bio = user.bio || '';
  user.total_following = user.total_following || 0;
  user.total_followers = user.total_followers || 0;
  user.links = user.links || {};
  user.links.website = user.links.website || '';
  user.links.spotify = user.links.spotify || '';
  user.links.itunes = user.links.itunes || '';
  user.links.instagram = user.links.instagram || '';
  user.links.twitter = user.links.twitter || '';
  user.links.tiktok = user.links.tiktok || '';
  user.links.youtube = user.links.youtube || '';

  user._id = String(user._id);

  return { props: { user } };
}
