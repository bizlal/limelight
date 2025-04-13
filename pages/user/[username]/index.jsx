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

  return {
    props: { user },
    // Revalidate after e.g. 10 minutes
    revalidate: 600,
  };
}
