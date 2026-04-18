import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentAttendee,
  loginAttendee,
  registerAttendee,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/auth/auth-client";
import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
} from "@/lib/auth/session-storage";
import type { AuthSession } from "@/lib/auth/types";

type AuthContextValue = {
  bootstrapped: boolean;
  errorMessage: string | null;
  isAuthenticating: boolean;
  session: AuthSession | null;
  signIn: (payload: LoginPayload) => Promise<boolean>;
  signUp: (payload: RegisterPayload) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const stored = await loadStoredSession();

        if (!stored) {
          setBootstrapped(true);
          return;
        }

        const user = await getCurrentAttendee(stored.accessToken);
        const nextSession = { ...stored, user };
        setSession(nextSession);
        await persistSession(nextSession);
      } catch {
        await clearStoredSession();
        setSession(null);
      } finally {
        setBootstrapped(true);
      }
    }

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapped,
      errorMessage,
      isAuthenticating,
      session,
      signIn: async (payload) => {
        setIsAuthenticating(true);
        setErrorMessage(null);

        try {
          const authResponse = await loginAttendee(payload);
          const nextSession = {
            ...authResponse,
            user: await getCurrentAttendee(authResponse.accessToken),
          };
          setSession(nextSession);
          await persistSession(nextSession);
          return true;
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Sign in failed. Please try again.",
          );
          return false;
        } finally {
          setIsAuthenticating(false);
        }
      },
      signUp: async (payload) => {
        setIsAuthenticating(true);
        setErrorMessage(null);

        try {
          const authResponse = await registerAttendee(payload);
          const nextSession = {
            ...authResponse,
            user: await getCurrentAttendee(authResponse.accessToken),
          };
          setSession(nextSession);
          await persistSession(nextSession);
          return true;
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Sign up failed. Please try again.",
          );
          return false;
        } finally {
          setIsAuthenticating(false);
        }
      },
      signOut: async () => {
        await clearStoredSession();
        setSession(null);
        setErrorMessage(null);
      },
    }),
    [bootstrapped, errorMessage, isAuthenticating, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
