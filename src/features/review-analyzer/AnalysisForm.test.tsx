import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnalysisForm } from "./AnalysisForm";

describe("AnalysisForm", () => {
  it("후기가 없으면 동시 분석 수 입력이 필요하다는 상태를 표시한다", () => {
    render(
      <AnalysisForm
        onCancel={vi.fn(async () => undefined)}
        onStart={vi.fn(async () => undefined)}
        running={false}
      />,
    );

    const concurrency = screen.getByRole("combobox", { name: "동시 분석 수" });
    expect(concurrency).toBeDisabled();
    expect(screen.getByRole("option", { name: "후기를 먼저 입력해 주세요." })).toBeDisabled();
    expect(screen.queryAllByRole("option", { name: /^[1-8]건$/u })).toHaveLength(0);
    expect(screen.getByText("후기를 먼저 입력해 주세요.")).toBeInTheDocument();
  });

  it("추천 답변 말투의 적용 범위를 설명한다", () => {
    render(
      <AnalysisForm
        onCancel={vi.fn(async () => undefined)}
        onStart={vi.fn(async () => undefined)}
        running={false}
      />,
    );

    expect(screen.getByRole("textbox", { name: "추천 답변 말투" })).toBeInTheDocument();
    expect(screen.getByText("감성, 요약, 핵심 내용은 그대로입니다.")).toBeInTheDocument();
    expect(screen.getByText("추천 답변 3건만 말투가 바뀝니다.")).toBeInTheDocument();
  });

  it("동시 분석 수를 현재 분석 대상 건수 이하로 제한한다", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn(async () => undefined);
    render(
      <AnalysisForm onCancel={vi.fn(async () => undefined)} onStart={onStart} running={false} />,
    );

    await user.type(screen.getByRole("textbox", { name: "상품명" }), "데일리 머그컵");
    await user.type(screen.getByRole("textbox", { name: "후기" }), "배송이 빨라서 만족합니다.");

    const concurrency = screen.getByRole("combobox", { name: "동시 분석 수" });
    expect(concurrency).toHaveValue("1");
    expect(screen.getAllByRole("option", { name: /건$/u })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "후기 분석 시작" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ maxConcurrency: 1 }));

    await user.type(
      screen.getByRole("textbox", { name: "후기" }),
      "{enter}포장이 꼼꼼합니다.{enter}색상이 예쁩니다.{enter}사용하기 편합니다.{enter}선물하기 좋습니다.",
    );
    expect(concurrency).toHaveValue("4");
    expect(screen.getAllByRole("option", { name: /건$/u })).toHaveLength(5);
  });

  it("동시 분석 수와 중복 처리 컨트롤을 같은 행 구조로 표시한다", () => {
    render(
      <AnalysisForm
        onCancel={vi.fn(async () => undefined)}
        onStart={vi.fn(async () => undefined)}
        running={false}
      />,
    );

    expect(screen.getByText("중복 후기 처리")).toBeInTheDocument();
  });
});
