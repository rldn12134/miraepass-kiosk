import { describe, expect, it } from "vitest";
import { destinationAfterLogin, safeNext } from "@/lib/auth-redirect";

describe("safeNext", () => {
  it("같은 사이트의 직원·관리자 화면만 허용한다", () => {
    expect(safeNext("/admin/orders?payment=refund_failed")).toBe("/admin/orders?payment=refund_failed");
    expect(safeNext("/staff")).toBe("/staff");
  });
  it("외부 주소, 프로토콜 상대 주소, 로그인 화면, 그 외 경로는 거절한다", () => {
    for (const bad of ["https://evil.example", "//evil.example/admin", "/\\evil.example", "/staff/login", "/admin/login?next=/admin", "/kiosk", "/api/orders", "", null]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});

describe("destinationAfterLogin", () => {
  it("원래 가려던 화면으로 돌아간다", () => {
    expect(destinationAfterLogin("admin", "admin", "/admin/menu")).toBe("/admin/menu");
    expect(destinationAfterLogin("staff", "staff", "/staff")).toBe("/staff");
    expect(destinationAfterLogin("admin", "staff", "/admin/settings")).toBe("/admin/settings");
  });
  it("next가 없으면 영역의 기본 화면", () => {
    expect(destinationAfterLogin("admin", "admin", null)).toBe("/admin");
    expect(destinationAfterLogin("staff", "staff", null)).toBe("/staff");
  });
  it("직원 계정은 관리자 화면 대신 직원 화면으로", () => {
    expect(destinationAfterLogin("staff", "admin", "/admin/menu")).toBe("/staff");
    expect(destinationAfterLogin("staff", "admin", null)).toBe("/staff");
  });
});
