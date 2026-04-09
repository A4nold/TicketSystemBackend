import { OwnedTicketDetail } from "@/features/tickets/owned-ticket-detail";

type OwnedTicketDetailPageProps = {
  params: Promise<{
    serialNumber: string;
  }>;
};

export default async function OwnedTicketDetailPage({
  params,
}: OwnedTicketDetailPageProps) {
  const resolved = await params;

  return <OwnedTicketDetail serialNumber={resolved.serialNumber} />;
}
