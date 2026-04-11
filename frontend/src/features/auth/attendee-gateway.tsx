"use client";

import { ProtectedSurfaceGate } from "@/features/auth/protected-surface-gate";
import { WalletSurface } from "@/features/wallet/wallet-surface";

type AttendeeGatewayProps = Readonly<{
  eventSlug?: string;
  recentOrderId?: string;
}>;

export function AttendeeGateway({ eventSlug, recentOrderId }: AttendeeGatewayProps) {
  const nextPath = eventSlug ? `/wallet?eventSlug=${eventSlug}` : "/wallet";

  return (
    <ProtectedSurfaceGate requiredSurface="attendee" nextPath={nextPath}>
      <WalletSurface eventSlug={eventSlug} recentOrderId={recentOrderId} />
    </ProtectedSurfaceGate>
  );
}
