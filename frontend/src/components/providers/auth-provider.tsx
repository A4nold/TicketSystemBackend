"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";

import { getCurrentAttendee } from "@/lib/auth/auth-client";
import type { AuthSession } from "@/lib/auth/types";

const SESSION_STORAGE_KEY = "ticketsystem.attendee.session";

type AuthContextValue = {
  isAuthenticated: boolean;
  isHydrating: boolean;
  notice: string | null;
  session: AuthSession | null;
  signOut: (options?: { notice?: string }) => void;
  clearNotice: () => void;
  setSession: (session: AuthSession | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (typeof window === "undefined") {
        if (isMounted) {
          setIsHydrating(false);
        }
        return;
      }

      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) {
        if (isMounted) {
          setIsHydrating(false);
        }
        return;
      }

      try {
        const parsed = JSON.parse(rawSession) as AuthSession;
        const user = await getCurrentAttendee(parsed.accessToken);

        if (!isMounted) {
          return;
        }

        setSession({
          ...parsed,
          user,
        });
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);

        if (!isMounted) {
          return;
        }

        setSession(null);
        setNotice("Your session expired or is no longer valid. Sign in again to continue.");
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);

    if (typeof window === "undefined") {
      return;
    }

    if (!nextSession) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  }, []);

  const signOut = useCallback((options?: { notice?: string }) => {
    persistSession(null);
    setNotice(options?.notice ?? "You signed out successfully.");
  }, [persistSession]);

  const value = useMemo(
    () => ({
      isAuthenticated: session !== null,
      isHydrating,
      notice,
      session,
      signOut,
      clearNotice: () => setNotice(null),
      setSession: persistSession,
    }),
    [isHydrating, notice, session, signOut, persistSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return value;
}
