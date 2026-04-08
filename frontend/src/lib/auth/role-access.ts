import type { AppSurface, AuthSession, AuthUser } from "@/lib/auth/types";

const DEMO_ROLE_EMAILS: Partial<Record<AppSurface, string[]>> = {
  organizer: ["organizer@campusnight.ie"],
  scanner: ["scanner@campusnight.ie"],
};

export function deriveAppRoles(user: AuthUser): AppSurface[] {
  const roles = new Set<AppSurface>(["attendee"]);

  for (const [surface, emails] of Object.entries(DEMO_ROLE_EMAILS) as Array<
    [AppSurface, string[] | undefined]
  >) {
    if (emails?.includes(user.email.toLowerCase())) {
      roles.add(surface);
    }
  }

  return Array.from(roles);
}

export function canAccessSurface(
  session: AuthSession | null,
  surface: AppSurface,
) {
  if (surface === "public") {
    return true;
  }

  if (!session) {
    return false;
  }

  return session.appRoles.includes(surface);
}

export function getDefaultSurfacePath(session: AuthSession | null) {
  if (!session) {
    return "/";
  }

  if (session.appRoles.includes("organizer")) {
    return "/organizer";
  }

  if (session.appRoles.includes("scanner")) {
    return "/scanner";
  }

  return "/tickets";
}

export function getVisibleSurfaces(session: AuthSession | null): AppSurface[] {
  if (!session) {
    return ["public"];
  }

  return ["public", ...session.appRoles];
}
