"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { RecentOrderPanel } from "@/features/checkout/recent-order-panel";
import { PendingStaffInvitesPanel } from "@/features/staff/pending-staff-invites-panel";
import { PendingTransferInboxPanel } from "@/features/transfers/pending-transfer-inbox-panel";
import { OwnedTicketList } from "@/features/tickets/owned-ticket-list";
import { WalletActivityPanel } from "@/features/tickets/wallet-activity-panel";
import { WalletAccountPanel } from "@/features/wallet/wallet-account-panel";
import { WalletHeroPanel } from "@/features/wallet/wallet-hero-panel";
import type { OwnedTicketSummary } from "@/lib/tickets/tickets-client";

type WalletSurfaceProps = Readonly<{
  eventSlug?: string;
  recentOrderId?: string;
}>;

export function WalletSurface({ eventSlug, recentOrderId }: WalletSurfaceProps) {
  const router = useRouter();
  const [walletTickets, setWalletTickets] = useState<OwnedTicketSummary[]>([]);
  const { clearNotice, notice, session, signOut } = useAuth();

  const nextPath = eventSlug ? `/wallet?eventSlug=${eventSlug}` : "/wallet";
  const authHref = `/auth?mode=login&next=${encodeURIComponent(
    nextPath,
  )}${eventSlug ? `&eventSlug=${encodeURIComponent(eventSlug)}` : ""}`;

  return (
    <div className="space-y-6">
      <WalletHeroPanel
        attendeeFirstName={session?.user.firstName}
        notice={notice}
        onDismissNotice={clearNotice}
      />

      <PendingStaffInvitesPanel />

      <PendingTransferInboxPanel />

      {recentOrderId ? <RecentOrderPanel orderId={recentOrderId} /> : null}

      <WalletActivityPanel recentOrderId={recentOrderId} tickets={walletTickets} />

      <WalletAccountPanel
        email={session?.user.email}
        eventSlug={eventSlug}
        onSignOut={() => {
          signOut({
            notice: "You signed out successfully. Sign in again to continue.",
          });
          router.push(authHref);
        }}
        returnHref={eventSlug ? `/events/${eventSlug}` : "/"}
        status={session?.user.status}
      />

      <OwnedTicketList eventSlug={eventSlug} onTicketsLoaded={setWalletTickets} />
    </div>
  );
}
