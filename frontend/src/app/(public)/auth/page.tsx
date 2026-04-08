import { AuthScreen } from "@/features/auth/auth-screen";

type AuthPageProps = {
  searchParams?: Promise<{
    eventSlug?: string;
    mode?: string;
    next?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const defaultMode = resolved?.mode === "login" ? "login" : "register";
  const nextPath =
    resolved?.next && resolved.next.startsWith("/")
      ? resolved.next
      : "/tickets";

  return (
    <AuthScreen
      defaultMode={defaultMode}
      eventSlug={resolved?.eventSlug}
      nextPath={nextPath}
    />
  );
}
