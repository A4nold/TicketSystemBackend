import { AttendeeGateway } from "@/features/auth/attendee-gateway";

type WalletSurfacePageProps = {
  searchParams?: Promise<{
    eventSlug?: string;
    recentOrderId?: string;
  }>;
};

export default async function WalletSurfacePage({
  searchParams,
}: WalletSurfacePageProps) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <AttendeeGateway
      eventSlug={resolved?.eventSlug}
      recentOrderId={resolved?.recentOrderId}
    />
  );
}
