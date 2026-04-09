import { TransferAcceptanceScreen } from "@/features/transfers/transfer-acceptance-screen";

type TransferAcceptancePageProps = {
  params: Promise<{
    serialNumber: string;
  }>;
};

export default async function TransferAcceptancePage({
  params,
}: TransferAcceptancePageProps) {
  const resolved = await params;

  return <TransferAcceptanceScreen serialNumber={resolved.serialNumber} />;
}
