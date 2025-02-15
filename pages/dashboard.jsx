import React, { useEffect } from 'react';
import { getAccessToken, usePrivy } from '@privy-io/react-auth';
import Dashboard from '@/page-components/Dashboard/Dashboard';
export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();

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
            uid: user.id,
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
          <Dashboard />
        </>
      ) : (
        <p>Loading or redirecting...</p>
      )}
    </main>
  );
}
