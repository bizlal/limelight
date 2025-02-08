// utils/spotifyAuthUrl.js
const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

const scopes = [
  'user-read-private',
  'user-read-email',
  'playlist-modify-private',
  // etc...
];

export function buildSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
