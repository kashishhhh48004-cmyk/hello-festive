import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(false);
      setBookmarks(new Set());
      return;
    }
    let cancelled = false;
    api('/me')
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {})
      .finally(() => !cancelled && setProfileLoaded(true));
    api('/bookmarks/ids')
      .then((ids) => !cancelled && setBookmarks(new Set(ids)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save / unsave an event (the heart icon)
  const toggleBookmark = useCallback(
    async (eventId) => {
      const saved = bookmarks.has(eventId);
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(eventId);
        else next.add(eventId);
        return next;
      });
      try {
        await api(`/bookmarks/${eventId}`, { method: saved ? 'DELETE' : 'POST' });
      } catch {
        // undo if it failed
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (saved) next.add(eventId);
          else next.delete(eventId);
          return next;
        });
      }
    },
    [bookmarks]
  );

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    profileLoaded,
    isAdmin: profile?.role === 'admin',
    loading,
    bookmarks,
    toggleBookmark,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
