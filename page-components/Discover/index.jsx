import { Spacer } from '@/components/Layout';
import styles from './Discover.module.css';
import TrackList from './TrackList';

export const Discover = () => {
  return (
    <div className={styles.root}>
      <Spacer size={1} axis="vertical" />
      <TrackList />
    </div>
  );
};
