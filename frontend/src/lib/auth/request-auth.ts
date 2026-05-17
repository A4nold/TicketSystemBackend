export const COOKIE_AUTH_TOKEN = "__cookie_auth__";

export function buildAuthorizationHeader(accessToken?: string | null) {
  if (!accessToken || accessToken === COOKIE_AUTH_TOKEN) {
    return {};
  }

  return {
    ...(accessToken && accessToken !== "__cookie_auth__" ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}
