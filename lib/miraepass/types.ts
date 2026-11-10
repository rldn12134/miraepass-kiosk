import type { CustomerType } from "../types";

export type MPUser = {
  id: number;
  type: CustomerType | "service";
  name: string;
  grade: number | null;
  classNo: number | null;
  point: number | null;
};

export type MPErrorCode =
  | "INSUFFICIENT_POINT"
  | "USER_NOT_FOUND"
  | "INVALID_CREDENTIALS"
  | "PIN_NOT_SET"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "LIMIT_EXCEEDED"
  | "UNAVAILABLE";

export class MiraepassError extends Error {
  constructor(
    public code: MPErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "MiraepassError";
  }
}

export interface MiraepassGateway {
  /** MIRAEPASS ID로 학생·교사 조회. 학생은 학번 4자리(3학년 4반 12번 → 3412), 교사는 고유 4자리 */
  findUser(id: number): Promise<MPUser | null>;
  /** 키오스크 결제 비밀번호(6자리 숫자) 확인. 설정하지 않았으면 PIN_NOT_SET */
  verifyKioskPin(id: number, pin: string): Promise<boolean>;
  /** 포인트 차감 → 남은 잔액 (서버가 잔액을 주지 않으면 null) */
  deduct(userId: number, amount: number, memo: string): Promise<number | null>;
  /** 포인트 지급(환불) */
  grant(userId: number, amount: number, memo: string): Promise<void>;
  /** 관리자/직원 로그인 확인. 세션은 즉시 폐기 */
  verifyCredentials(id: number, password: string): Promise<MPUser>;
}
