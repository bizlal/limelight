import { findUserByUsername } from '@/api-lib/db';
import { getMongoDb } from '@/api-lib/mongodb';
import { User } from '@/page-components/User';
import Head from 'next/head';

export default function UserPage({ user }) {
  return (
    <>
      <Head>
        <title>
          {user.name} (@{user.username})
        </title>
      </Head>
      <User user={user} />
    </>
  );
}
export async function getServerSideProps(context) {
  const db = await getMongoDb();

  const user = await findUserByUsername(db, context.params.username);
  if (!user) {
    return {
      notFound: true,
    };
  }
  if (user) {
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
  }
  user._id = String(user._id);
  return { props: { user } };
}
