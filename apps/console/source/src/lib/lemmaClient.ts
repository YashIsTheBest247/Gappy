/**
 * Lemma SDK client bootstrap — the one place that constructs the client.
 * The Lemma runtime injects window.__LEMMA_CONFIG__ at deploy time; for local
 * `npm run dev` we fall back to the VITE_LEMMA_* env vars.
 */
import { LemmaClient, type LemmaConfig } from "lemma-sdk";

function resolve(): LemmaConfig {
  const w = (typeof window !== "undefined" ? window.__LEMMA_CONFIG__ : undefined) ?? {};
  return {
    apiUrl: w.apiUrl ?? import.meta.env.VITE_LEMMA_API_URL ?? "",
    authUrl: w.authUrl ?? import.meta.env.VITE_LEMMA_AUTH_URL ?? "",
    podId: w.podId ?? import.meta.env.VITE_LEMMA_POD_ID ?? undefined,
  };
}

const config = resolve();
export const client = new LemmaClient(config);
export const podId: string = config.podId ?? "";
