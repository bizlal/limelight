import { findUserByUsername } from '@/api-lib/db';
import { getMongoDb } from '@/api-lib/mongodb';
import { User } from '@/page-components/User';
import Head from 'next/head';

export default function UserPage({ user }) {
  // Build a short description from user's bio or fallback
  const userDescription = user.bio
    ? user.bio.slice(0, 160)
    : `View ${user.name} (@${user.username}) on Limelight.`;

  const ogImage = user.profileImage || '/images/default-profile.jpg';

  return (
    <>
      <Head>
        <title>
          {user.name} (@{user.username}) | Limelight
        </title>
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
        <meta
          property="og:url"
          content={`https://lmlt.ai/user/${user.username}`}
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${user.name} (@${user.username}) | Limelight`}
        />
        <meta name="twitter:description" content={userDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <User user={user} />
    </>
  );
}

/**
 * getStaticPaths with an empty array:
 *   - We won't pre-generate any user pages at build time
 *   - We'll rely on fallback: 'blocking' to generate them on first request
 */
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}

export async function getStaticProps({ params }) {
  const db = await getMongoDb();
  const user = await findUserByUsername(db, params.username);

  if (!user) {
    return { notFound: true };
  }

  // Map the new structure
  const mappedUser = {
    _id: String(user._id.$oid || user._id),
    migrated: user.migrated || false,
    uid: user.uid || '',
    fcmToken: user.fcmToken || '',
    isCreator: user.isCreator || false,
    createdAt: user.createdAt?.$date
      ? new Date(user.createdAt.$date).toISOString()
      : null,
    updatedAt: user.updatedAt?.$date
      ? new Date(user.updatedAt.$date).toISOString()
      : null,
    profile: {
      image: user.profile?.image || '',
      cover: user.profile?.cover || '',
      name: user.profile?.name || '',
      username: user.profile?.username || '',
      bio: user.profile?.bio || '',
      total_following: user.profile?.total_following || 0,
      total_followers: user.profile?.total_followers || 0,
      email_address: user.profile?.email_address || '',
      links: {
        website: user.profile?.links?.website || '',
        spotify: user.profile?.links?.spotify || '',
        itunes: user.profile?.links?.itunes || '',
        instagram: user.profile?.links?.instagram || '',
        twitter: user.profile?.links?.twitter || '',
      },
      web3: {
        public_address: user.profile?.web3?.public_address || '',
      },
    },
    location: {
      city: user.location?.city || '',
      state: user.location?.state || '',
      country: user.location?.country || '',
      latitude: user.location?.latitude || 0,
      longitude: user.location?.longitude || 0,
      geohash: user.location?.geohash || '',
      country_code: user.location?.country_code || '',
    },
    metrics: {
      loginMetrics: {
        lastLogin: user.metrics?.loginMetrics?.lastLogin?.$date
          ? new Date(user.metrics.loginMetrics.lastLogin.$date).toISOString()
          : null,
        totalLogins: user.metrics?.loginMetrics?.totalLogins || 0,
        lastLoginPlatform: user.metrics?.loginMetrics?.lastLoginPlatform || '',
      },
      contentEngagement: {
        totalPostsCreated:
          user.metrics?.contentEngagement?.totalPostsCreated || 0,
        totalCommentsMade:
          user.metrics?.contentEngagement?.totalCommentsMade || 0,
        totalLikesGiven: user.metrics?.contentEngagement?.totalLikesGiven || 0,
      },
      music_web_app: {
        signInCount: user.metrics?.music_web_app?.signInCount || 0,
      },
      music_ios_app: {
        openCount: user.metrics?.music_ios_app?.openCount || 0,
      },
    },
  };

  return {
    props: { user: mappedUser },
    // Revalidate after e.g. 10 minutes
    revalidate: 600,
  };
}
