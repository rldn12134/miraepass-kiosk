import { describe, expect, it } from "vitest";
import { candidateHonorific, customerLabel, fillTemplate, maskName } from "@/lib/format";

describe("format", () => {
  it("이름 가운데를 마스킹한다", () => {
    expect(maskName("홍길동")).toBe("홍*동");
    expect(maskName("남궁민수")).toBe("남**수");
    expect(maskName("김미")).toBe("김*");
    expect(maskName("김")).toBe("김");
  });
  it("음성 템플릿을 치환한다", () => {
    expect(fillTemplate("{grade}학년 {name}님, 주문하신 음료가 나왔습니다.", { grade: 3, name: "홍길동" })).toBe(
      "3학년 홍길동님, 주문하신 음료가 나왔습니다.",
    );
    expect(fillTemplate("{unknown}입니다", {})).toBe("입니다");
  });
  it("고객 표시 이름", () => {
    expect(customerLabel({ customerType: "teacher", customerName: "김선생", customerGrade: null })).toBe("김선생 선생님");
    expect(customerLabel({ customerType: "student", customerName: "최코딩", customerGrade: 3 })).toBe("3학년 최코딩");
  });
  it("키오스크 호칭에 '님'을 한 번만 붙인다", () => {
    expect(candidateHonorific({ type: "student", displayName: "임*재", grade: 3, classNo: 4 })).toBe("3학년 4반 임*재님");
    expect(candidateHonorific({ type: "teacher", displayName: "교*", grade: null, classNo: null })).toBe("교* 선생님");
  });
});
