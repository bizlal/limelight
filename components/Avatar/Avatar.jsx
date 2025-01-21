import styles from './Avatar.module.css';
import Image from 'next/image';

const Avatar = ({ size, username, url }) => {
  <Image
    className={styles.avatar}
    src={url || '/images/default_user.jpg'}
    alt={username}
    width={size}
    height={size}
  />;
};

export default Avatar;
