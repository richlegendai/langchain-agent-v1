import { describe, expect, it } from "vitest";

import { escapeCsvCell } from "./export";

describe("escapeCsvCell", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "\tformula"])(
    "수식으로 실행될 수 있는 셀 %s를 문자로 고정한다",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`'${value}`);
    },
  );

  it("캐리지 리턴으로 시작하는 수식 셀을 접두사 처리하고 감싼다", () => {
    expect(escapeCsvCell("\rformula")).toBe('"\'\rformula"');
  });

  it("쉼표와 큰따옴표를 RFC 4180 형식으로 감싼다", () => {
    expect(escapeCsvCell('좋아요, "추천"')).toBe('"좋아요, ""추천"""');
  });
});
