import type { AppSurface, AuthSession, AuthUser } from "@/lib/auth/types";

export function deriveAppRoles(user: AuthUser): AppSurface[] {
  return user.appRoles;
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

  return session.user.appRoles.includes(surface);
}

export function getDefaultSurfacePath(session: AuthSession | null) {
  if (!session) {
    return "/";
  }

  if (session.user.appRoles.includes("organizer")) {
    return "/organizer";
  }

  if (session.user.appRoles.includes("scanner")) {
    return "/scanner";
  }

  return "/tickets";
}

export function getVisibleSurfaces(session: AuthSession | null): AppSurface[] {
  if (!session) {
    return ["public"];
  }

  return ["public", ...session.user.appRoles];
}
