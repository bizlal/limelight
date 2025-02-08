// lib/discover/hooks.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useDiscover() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDiscoverTracks() {
      try {
        const response = await axios.get('/api/discover');
        setTracks(response.data.tracks || []);
      } catch (err) {
        setError(err.message || 'Error fetching discovered tracks');
      } finally {
        setLoading(false);
      }
    }
    fetchDiscoverTracks();
  }, []);

  return { tracks, loading, error };
}
