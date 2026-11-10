import type { CustomerType, OrderStatus, PaymentStatus } from "./types";

/** 가운데 글자 마스킹: 홍길동 → 홍*동, 김미 → 김* */
export function maskName(name: string) {
  const chars = [...name];
  if (chars.length <= 1) return name;
  if (chars.length === 2) return `${chars[0]}*`;
  return chars[0] + "*".repeat(chars.length - 2) + chars[chars.length - 1];
}

export const formatPoint = (n: number) => `${n.toLocaleString("ko-KR")}P`;

export function customerLabel(o: { customerType: CustomerType; customerName: string; customerGrade: number | null }) {
  if (o.customerType === "teacher") return `${o.customerName} 선생님`;
  return o.customerGrade ? `${o.customerGrade}학년 ${o.customerName}` : o.customerName;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "결제 중",
  failed: "결제 실패",
  received: "접수 대기",
  preparing: "제조 중",
  ready: "픽업 대기",
  completed: "완료",
  cancelled: "취소",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "미결제",
  paid: "결제 완료",
  failed: "결제 실패",
  refunded: "환불 완료",
  refund_failed: "환불 실패",
};

/** 음성 템플릿 치환: {name} {grade} {orderNo} {menu} */
export function fillTemplate(template: string, vars: Record<string, string | number | null | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** 키오스크에서 고객을 부르는 이름: "3학년 4반 최*딩" / "홍*동 선생님" */
export function candidateLabel(c: { type: CustomerType; displayName: string; grade: number | null; classNo: number | null }) {
  if (c.type === "teacher") return `${c.displayName} 선생님`;
  const parts = [c.grade ? `${c.grade}학년` : null, c.classNo ? `${c.classNo}반` : null, c.displayName];
  return parts.filter(Boolean).join(" ");
}

/** 존칭 포함 호칭: "3학년 4반 최*딩님" / "홍*동 선생님" ('선생님' 뒤에 '님'을 또 붙이지 않는다) */
export function candidateHonorific(c: Parameters<typeof candidateLabel>[0]) {
  const label = candidateLabel(c);
  return c.type === "teacher" ? label : `${label}님`;
}
