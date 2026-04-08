export const appSurfaces = [
  "public",
  "attendee",
  "organizer",
  "scanner",
] as const;

export type AppSurface = (typeof appSurfaces)[number];
