import { redirect } from "next/navigation";

type OwnedTicketDetailPageProps = {
  params: Promise<{
    serialNumber: string;
  }>;
};

export default async function OwnedTicketDetailPage({
  params,
}: OwnedTicketDetailPageProps) {
  const resolved = await params;

  redirect(`/wallet/${encodeURIComponent(resolved.serialNumber)}`);
}
