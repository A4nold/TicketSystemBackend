import { redirect } from "next/navigation";

type CheckoutStartAliasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutStartAliasPage({
  searchParams,
}: CheckoutStartAliasPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved ?? {})) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const suffix = query.toString();
  redirect(`/tickets/checkout/start${suffix ? `?${suffix}` : ""}`);
}
