import { SetMetadata } from "@nestjs/common";
import { StaffRole } from "@prisma/client";

export const EVENT_ROLE_METADATA_KEY = "eventRoles";

export const RequireEventRoles = (...roles: StaffRole[]) =>
  SetMetadata(EVENT_ROLE_METADATA_KEY, roles);
