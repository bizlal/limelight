// useTrackPages.js

import { fetcher } from '@/lib/fetch';
import useSWRInfinite from 'swr/infinite';

export function useTrackPages({ uid, limit = 10 } = {}) {
  const { data, error, size, ...props } = useSWRInfinite(
    (index, previousPageData) => {
      // If we've reached the end (no more tracks), return null to stop fetching
      if (previousPageData && previousPageData.tracks.length === 0) return null;

      // Build query params
      const searchParams = new URLSearchParams();
      searchParams.set('limit', limit);

      // Optional: filter tracks by user/artist ID if passed
      if (uid) searchParams.set('by', uid);

      // For subsequent pages, fetch tracks before the last track's creation date
      if (index !== 0) {
        const lastTrack =
          previousPageData.tracks[previousPageData.tracks.length - 1];
        const beforeDate = new Date(new Date(lastTrack.createdAt).getTime());
        searchParams.set('before', beforeDate.toJSON());
      }

      return `/api/tracks?${searchParams.toString()}`;
    },
    fetcher,
    {
      refreshInterval: 10000,
      revalidateAll: false,
    }
  );

  // Checking various states
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.tracks?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.tracks?.length < limit);

  return {
    data,
    error,
    size,
    isLoadingMore,
    isReachingEnd,
    ...props,
  };
}
