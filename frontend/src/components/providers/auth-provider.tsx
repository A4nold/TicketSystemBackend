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
import { deriveAppRoles } from "@/lib/auth/role-access";

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

function normalizeSession(nextSession: AuthSession | null): AuthSession | null {
  if (!nextSession) {
    return null;
  }

  return {
    ...nextSession,
    user: {
      ...nextSession.user,
      appRoles: deriveAppRoles(nextSession.user),
      memberships: Array.isArray(nextSession.user.memberships)
        ? nextSession.user.memberships
        : [],
    },
  };
}

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

        setSession(normalizeSession({
          ...parsed,
          user,
        }));
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
    const normalizedSession = normalizeSession(nextSession);
    setSession(normalizedSession);

    if (typeof window === "undefined") {
      return;
    }

    if (!normalizedSession) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
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
