'use client';

import { useEffect, useState } from 'react';
type User = {
  id: string;
  email: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Offline single-user mode:
    // Treat the user as always signed in with a placeholder identity.
    setUser({
      id: 'offline-user',
      email: 'offline@local',
    });
    setLoading(false);
  }, []);

  const signOut = async () => {
    // In offline mode there is nothing to sign out from.
    setUser(null);
  };

  return { user, loading, signOut };
}
