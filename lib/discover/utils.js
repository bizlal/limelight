// lib/discover/utils.js
/**
 * Formats a discovered track into a simpler object.
 * Adjust the mapping as needed based on your track object shape.
 */
export function formatDiscoverTrack(track) {
  return {
    id: track.id,
    name: track.name,
    // If track.artists is an array of strings or objects, adjust accordingly.
    artists: Array.isArray(track.artists)
      ? track.artists.join(', ')
      : track.artists || '',
    album: track.album || '',
    cover: track.cover || '',
    previewUrl: track.previewUrl || '',
  };
}
