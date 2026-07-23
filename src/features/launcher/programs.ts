import { type LucideIcon, MessageSquareText, Sparkles, Tags } from "lucide-react";

export type ProgramDefinition = Readonly<{
  id: "review-analyzer" | "question-miner" | "product-copy";
  title: string;
  description: string;
  version: string;
  status: "available" | "coming_soon";
  icon: LucideIcon;
  route: string;
  requiredCapabilities: readonly string[];
}>;

export const PROGRAMS: readonly ProgramDefinition[] = [
  {
    id: "review-analyzer",
    title: "상품 후기 분석",
    description: "여러 후기를 분석하고 상황에 맞는 답변 후보를 만듭니다.",
    version: "0.1.0",
    status: "available",
    icon: MessageSquareText,
    route: "review-analyzer",
    requiredCapabilities: ["review-analysis-sidecar", "save-export"],
  },
  {
    id: "question-miner",
    title: "고객 질문 분류",
    description: "반복되는 문의를 주제별로 묶고 우선순위를 정합니다.",
    version: "계획됨",
    status: "coming_soon",
    icon: Tags,
    route: "question-miner",
    requiredCapabilities: [],
  },
  {
    id: "product-copy",
    title: "상품 문구 도우미",
    description: "상품 정보에서 채널별 소개 문구를 만드는 프로그램입니다.",
    version: "계획됨",
    status: "coming_soon",
    icon: Sparkles,
    route: "product-copy",
    requiredCapabilities: [],
  },
];
