import { redirect } from "next/navigation";

type TicketsSurfacePageProps = {
  searchParams?: Promise<{
    eventSlug?: string;
    recentOrderId?: string;
  }>;
};

export default async function TicketsSurfacePage({
  searchParams,
}: TicketsSurfacePageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const next = new URLSearchParams();

  if (resolved?.eventSlug) {
    next.set("eventSlug", resolved.eventSlug);
  }

  if (resolved?.recentOrderId) {
    next.set("recentOrderId", resolved.recentOrderId);
  }

  redirect(`/wallet${next.size > 0 ? `?${next.toString()}` : ""}`);
}
