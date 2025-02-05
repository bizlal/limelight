// lib/connections/utils.js
const SPOTIFY_SCOPES = [
  'user-read-recently-played',
  'user-read-private',
  'user-read-email',
];

export function buildSpotifyAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SPOTIFY_CLIENT_ID and/or NEXT_PUBLIC_SPOTIFY_REDIRECT_URI'
    );
  }

  const spotifyAuthEndpoint = 'https://accounts.spotify.com/authorize';
  const queryParams = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES.join(' '),
    show_dialog: 'true',
  });

  return `${spotifyAuthEndpoint}?${queryParams.toString()}`;
}
