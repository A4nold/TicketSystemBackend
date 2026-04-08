import { AttendeeGateway } from "@/features/auth/attendee-gateway";

type TicketsSurfacePageProps = {
  searchParams?: Promise<{
    eventSlug?: string;
  }>;
};

export default async function TicketsSurfacePage({
  searchParams,
}: TicketsSurfacePageProps) {
  const resolved = searchParams ? await searchParams : undefined;

  return <AttendeeGateway eventSlug={resolved?.eventSlug} />;
}
