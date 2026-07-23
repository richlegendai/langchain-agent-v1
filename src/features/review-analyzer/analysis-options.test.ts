import { describe, expect, it } from "vitest";

import { parseProviderName } from "./analysis-options";

describe("parseProviderName", () => {
  it("지원하는 모델 제공자를 반환한다", () => {
    expect(parseProviderName("ollama")).toBe("ollama");
  });

  it("지원하지 않는 모델 제공자를 거부한다", () => {
    expect(() => parseProviderName("unknown")).toThrow();
  });
});
