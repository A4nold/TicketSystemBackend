import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z
    .string()
    .email()
    .default("support@ticketsystem.local"),
  NEXT_PUBLIC_SUPPORT_LABEL: z
    .string()
    .min(1)
    .default("support@ticketsystem.local"),
});

const parsedEnv = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPPORT_EMAIL:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@ticketsystem.local",
  NEXT_PUBLIC_SUPPORT_LABEL:
    process.env.NEXT_PUBLIC_SUPPORT_LABEL ?? "support@ticketsystem.local",
});

export const env = {
  apiBaseUrl: parsedEnv.NEXT_PUBLIC_API_BASE_URL,
  supportEmail: parsedEnv.NEXT_PUBLIC_SUPPORT_EMAIL,
  supportLabel: parsedEnv.NEXT_PUBLIC_SUPPORT_LABEL,
};

export function getApiOriginLabel() {
  return new URL(env.apiBaseUrl).origin;
}
