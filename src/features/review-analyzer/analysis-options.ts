import { z } from "zod";

import type { ProviderName } from "../../lib/contracts";

const PROVIDER_NAMES = ["ollama", "groq", "openai"] as const satisfies readonly ProviderName[];
const providerNameSchema = z.enum(PROVIDER_NAMES);

export const MODELS: Readonly<Record<ProviderName, readonly string[]>> = {
  ollama: ["gemma4:e2b"],
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"],
  openai: ["gpt-4.1-mini", "gpt-4.1"],
};

export function parseProviderName(input: unknown): ProviderName {
  return providerNameSchema.parse(input);
}
