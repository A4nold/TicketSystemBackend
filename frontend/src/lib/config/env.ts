import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
});

const parsedEnv = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
});

export const env = {
  apiBaseUrl: parsedEnv.NEXT_PUBLIC_API_BASE_URL,
};

export function getApiOriginLabel() {
  return new URL(env.apiBaseUrl).origin;
}
