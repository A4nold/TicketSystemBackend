import { CheckoutReturnStatus } from "@/features/checkout/checkout-return-status";

type CheckoutCancelPageProps = {
  searchParams?: Promise<{
    orderId?: string;
    session_id?: string;
  }>;
};

export default async function CheckoutCancelPage({
  searchParams,
}: CheckoutCancelPageProps) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <CheckoutReturnStatus
      mode="cancel"
      orderId={resolved?.orderId}
      sessionId={resolved?.session_id}
    />
  );
}
