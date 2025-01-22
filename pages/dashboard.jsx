import React, { useEffect } from 'react';
import { getAccessToken, usePrivy } from '@privy-io/react-auth';

export default function DashboardPage() {
  const { ready, authenticated, user, logout } = usePrivy();

  useEffect(() => {
    async function syncPrivyUser() {
      try {
        const token = await getAccessToken();

        await fetch('/api/sync-privy-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            privyId: user.id,
            email: user.email?.address,
          }),
        });
      } catch (err) {
        console.error('Failed to sync user:', err);
      }
    }

    if (ready && authenticated && user) {
      syncPrivyUser();
    }
  }, [ready, authenticated, user]);

  return (
    <main>
      {ready && authenticated ? (
        <>
          <h1>Welcome, {user.email?.address || 'Privy User'}</h1>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Loading or redirecting...</p>
      )}
    </main>
  );
}
