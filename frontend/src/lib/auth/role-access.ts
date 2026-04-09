import type { AppSurface, AuthSession, AuthUser } from "@/lib/auth/types";

function getAppRoles(value: AuthSession | AuthUser | null | undefined): AppSurface[] {
  const appRoles =
    value && "user" in value ? value.user?.appRoles : value?.appRoles;
  const platformRoles =
    value && "user" in value ? value.user?.platformRoles : value?.platformRoles;

  if (Array.isArray(appRoles) && appRoles.length > 0) {
    return Array.from(
      new Set([
        ...appRoles,
        ...(Array.isArray(platformRoles) && platformRoles.includes("EVENT_OWNER")
          ? ["organizer" as const]
          : []),
      ]),
    );
  }

  if (Array.isArray(platformRoles) && platformRoles.includes("EVENT_OWNER")) {
    return ["attendee", "organizer"];
  }

  return ["attendee"];
}

export function deriveAppRoles(user: AuthUser): AppSurface[] {
  return getAppRoles(user);
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

  return getAppRoles(session).includes(surface);
}

export function getDefaultSurfacePath(session: AuthSession | null) {
  if (!session) {
    return "/";
  }

  const appRoles = getAppRoles(session);

  if (appRoles.includes("organizer")) {
    return "/organizer";
  }

  if (appRoles.includes("scanner")) {
    return "/scanner";
  }

  return "/tickets";
}

export function getVisibleSurfaces(session: AuthSession | null): AppSurface[] {
  if (!session) {
    return ["public"];
  }

  return ["public", ...getAppRoles(session)];
}
