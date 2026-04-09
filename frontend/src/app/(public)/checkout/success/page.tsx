import { CheckoutReturnStatus } from "@/features/checkout/checkout-return-status";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    orderId?: string;
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <CheckoutReturnStatus
      mode="success"
      orderId={resolved?.orderId}
      sessionId={resolved?.session_id}
    />
  );
}
