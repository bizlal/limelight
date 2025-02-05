import { Button } from "@/components/Button";
import { Container, Spacer } from "@/components/Layout";
import Wrapper from "@/components/Layout/Wrapper";
import { Track } from "@/components/Track"; // The track component we wrote earlier
import { Text } from "@/components/Text";
// Replace with your real data hook
import { useTrackPages } from "@/lib/track";
import Link from "next/link";
import styles from "./TrackList.module.css";

const TrackList = () => {
  // Hypothetical hook that paginates track data (similar to usePostPages)
  const { data, size, setSize, isLoadingMore, isReachingEnd } = useTrackPages();

  // Flatten pages of tracks into a single array
  const tracks = data
    ? data.reduce((acc, page) => [...acc, ...page.tracks], [])
    : [];

  return (
    <div className={styles.root}>
      <Spacer axis="vertical" size={1} />
      <Wrapper>
        {tracks.map((track) => (
          <Link
            legacyBehavior
            key={track._id}
            href={`/track/${track._id}`}
            passHref
          >
            <div className={styles.trackCard}>
              <Track className={styles.track} track={track} />
            </div>
          </Link>
        ))}

        <Container justifyContent="center">
          {isReachingEnd ? (
            <Text color="secondary">No more tracks found</Text>
          ) : (
            <Button
              variant="ghost"
              type="success"
              loading={isLoadingMore}
              onClick={() => setSize(size + 1)}
            >
              Load more
            </Button>
          )}
        </Container>
      </Wrapper>
    </div>
  );
};

export default TrackList;
