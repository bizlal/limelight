import styles from './User.module.css';
import UserHeader from './UserHeader';
import UserPosts from './UserPosts';
import Poster from '../Feed/Poster';
export const User = ({ user }) => {
  return (
    <div className={styles.root}>
      <UserHeader user={user} />
      <Poster  />
      <UserPosts user={user} />
    </div>
  );
};
