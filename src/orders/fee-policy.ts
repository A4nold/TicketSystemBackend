import { Prisma } from "@prisma/client";

export type FeeModel = "BLENDED";
export type FeeResponsibility = "BUYER" | "ORGANIZER";
export type FixedFeeApplication = "PER_ORDER" | "PER_TICKET";

export type FeePolicy = {
  displayName: string;
  fixedAmount: Prisma.Decimal;
  fixedFeeApplication: FixedFeeApplication;
  model: FeeModel;
  percentRate: Prisma.Decimal;
  responsibility: FeeResponsibility;
};

export type AppliedFeeTotals = {
  buyerFee: Prisma.Decimal;
  currency: string;
  organizerFee: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
};

export function resolveFeePolicy(): FeePolicy {
  return {
    displayName: process.env.CHECKOUT_FEE_DISPLAY_NAME?.trim() || "Service fee",
    fixedAmount: parseDecimalEnv("CHECKOUT_FEE_FIXED_AMOUNT", "0.69"),
    fixedFeeApplication:
      process.env.CHECKOUT_FEE_FIXED_APPLICATION === "PER_ORDER" ? "PER_ORDER" : "PER_TICKET",
    model: "BLENDED",
    percentRate: parseDecimalEnv("CHECKOUT_FEE_PERCENT_RATE", "0.0695"),
    responsibility:
      process.env.CHECKOUT_FEE_RESPONSIBILITY === "ORGANIZER" ? "ORGANIZER" : "BUYER",
  };
}

export function calculateFeeTotals({
  currency,
  itemCount,
  policy,
  subtotal,
}: {
  currency: string;
  itemCount: number;
  policy: FeePolicy;
  subtotal: Prisma.Decimal;
}): AppliedFeeTotals {
  const percentComponent = subtotal.mul(policy.percentRate);
  const fixedMultiplier =
    policy.fixedFeeApplication === "PER_TICKET" ? new Prisma.Decimal(itemCount) : new Prisma.Decimal(1);
  const fixedComponent = policy.fixedAmount.mul(fixedMultiplier);
  const computedFee = percentComponent.add(fixedComponent).toDecimalPlaces(2);
  const buyerFee = policy.responsibility === "BUYER" ? computedFee : new Prisma.Decimal(0);
  const organizerFee =
    policy.responsibility === "ORGANIZER" ? computedFee : new Prisma.Decimal(0);

  return {
    buyerFee,
    currency,
    organizerFee,
    platformFee: computedFee,
    subtotal,
    total: subtotal.add(buyerFee),
  };
}

function parseDecimalEnv(name: string, fallback: string) {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return new Prisma.Decimal(fallback);
  }

  try {
    return new Prisma.Decimal(raw);
  } catch {
    return new Prisma.Decimal(fallback);
  }
}
