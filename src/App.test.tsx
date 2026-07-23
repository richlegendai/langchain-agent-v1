import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { errorMessage, ReviewAnalyzer } from "./features/review-analyzer/ReviewAnalyzer";

describe("errorMessage", () => {
  it("Tauri 명령의 구조화 오류 메시지를 반환한다", () => {
    expect(errorMessage({ code: "sidecar_failed", message: "분석 프로세스가 실패했습니다." })).toBe(
      "분석 프로세스가 실패했습니다.",
    );
  });

  it("지원하지 않는 오류 값에는 기본 메시지를 반환한다", () => {
    expect(errorMessage("sidecar_failed")).toBe("알 수 없는 오류가 발생했습니다.");
  });
});

describe("App", () => {
  it("Tauri 앱에서 연결 상태 배지를 표시하지 않는다", () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    try {
      render(<ReviewAnalyzer onBack={vi.fn()} />);
      expect(screen.queryByText("Tauri 연결됨")).not.toBeInTheDocument();
      expect(screen.queryByText("브라우저 미리보기")).not.toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    }
  });

  it("런처에서 상품 후기 분석 화면으로 이동하고 돌아온다", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /상품 후기 분석/ }));
    expect(screen.getByRole("heading", { name: "상품 후기 분석" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "모델" })).toHaveValue("gemma4:e2b");
    expect(screen.getByText("분석 설정에 상품명과 후기를 입력해 주세요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "프로그램 목록" }));
    expect(screen.getByRole("heading", { name: "프로그램" })).toBeInTheDocument();
  });

  it("브라우저 미리보기에서 후기 분석 결과를 만든다", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /상품 후기 분석/ }));
    await user.type(screen.getByRole("textbox", { name: "상품명" }), "데일리 머그컵");
    await user.type(screen.getByRole("textbox", { name: "후기" }), "배송이 빨라서 만족합니다.");
    await user.click(screen.getByRole("button", { name: "후기 분석 시작" }));

    expect(await screen.findByText("성공 1건, 실패 0건, 전체 1건")).toBeInTheDocument();
    expect(screen.getAllByText("브라우저 미리보기에서 생성한 예시 요약입니다.")).not.toHaveLength(
      0,
    );
  });

  it("다른 후기를 확인한 뒤에도 수정한 답변을 보존한다", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /상품 후기 분석/ }));
    await user.type(screen.getByRole("textbox", { name: "상품명" }), "데일리 머그컵");
    await user.type(
      screen.getByRole("textbox", { name: "후기" }),
      "배송이 빨라서 만족합니다.{enter}포장이 꼼꼼해서 좋았습니다.",
    );
    await user.click(screen.getByRole("button", { name: "후기 분석 시작" }));
    await screen.findByText("성공 2건, 실패 0건, 전체 2건");

    const firstReply = screen.getByDisplayValue("소중한 후기 남겨주셔서 감사합니다.");
    await user.clear(firstReply);
    await user.type(firstReply, "수정한 고객 답변입니다.");
    await user.click(screen.getByRole("button", { name: /후기 2/ }));
    await user.click(screen.getByRole("button", { name: /후기 1/ }));

    expect(screen.getByDisplayValue("수정한 고객 답변입니다.")).toBeInTheDocument();
  });
});
