import { z } from "zod";

export const CONTRACT_VERSION = "1.0";

const contractVersionSchema = z.literal(CONTRACT_VERSION);
const errorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
});

const candidateSchema = z.object({
  candidate_id: z.string().min(1),
  tone: z.string().min(1),
  text: z.string().min(1),
  rationale: z.string().min(1),
});

const analysisSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  summary: z.string().min(1),
  key_points: z.array(z.string()).max(5),
  response_strategy: z.array(z.string()).max(4),
  reply_candidates: z.array(candidateSchema).length(3),
  warnings: z.array(z.string()),
});

const jobStartedSchema = z.object({
  schema_version: contractVersionSchema,
  event: z.literal("job_started"),
  job_id: z.string().min(1),
  total: z.number().int().min(1).max(200),
});

const reviewResultSchema = z
  .object({
    schema_version: contractVersionSchema,
    event: z.literal("review_result"),
    job_id: z.string().min(1),
    review_id: z.string().min(1),
    source_index: z.number().int().nonnegative(),
    status: z.enum(["succeeded", "failed"]),
    analysis: analysisSchema.nullable(),
    error: errorSchema.nullable(),
  })
  .superRefine((event, context) => {
    const validSuccess =
      event.status === "succeeded" && event.analysis !== null && event.error === null;
    const validFailure =
      event.status === "failed" && event.analysis === null && event.error !== null;
    if (!(validSuccess || validFailure)) {
      context.addIssue({ code: "custom", message: "상태와 결과 데이터가 일치하지 않습니다." });
    }
  });

const jobFinishedSchema = z.object({
  schema_version: contractVersionSchema,
  event: z.literal("job_finished"),
  job_id: z.string().min(1),
  succeeded_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
});

const fatalErrorSchema = z.object({
  schema_version: contractVersionSchema,
  event: z.literal("fatal_error"),
  error: errorSchema,
});

const sidecarEventSchema = z.union([
  jobStartedSchema,
  reviewResultSchema,
  jobFinishedSchema,
  fatalErrorSchema,
]);

export type SidecarEvent = z.infer<typeof sidecarEventSchema>;
export type ReviewResultEvent = z.infer<typeof reviewResultSchema>;
export type ReviewAnalysis = z.infer<typeof analysisSchema>;

export type ProviderName = "ollama" | "groq" | "openai";

export type ReviewInput = Readonly<{
  review_id: string;
  source_index: number;
  original_text: string;
}>;

export type AnalysisRequest = Readonly<{
  schema_version: typeof CONTRACT_VERSION;
  type: "analyze";
  job_id: string;
  settings: Readonly<{
    provider: ProviderName;
    model: string;
    product_name: string;
    max_concurrency: number;
    brand_voice: string;
  }>;
  reviews: readonly ReviewInput[];
}>;

class ContractVersionError extends Error {
  constructor() {
    super("지원하지 않는 메시지 계약 버전입니다.");
    this.name = "ContractVersionError";
  }
}

export function parseSidecarEvent(input: unknown): SidecarEvent {
  const envelope = z.object({ schema_version: z.unknown() }).safeParse(input);
  if (envelope.success && envelope.data.schema_version !== CONTRACT_VERSION) {
    throw new ContractVersionError();
  }
  return sidecarEventSchema.parse(input);
}
