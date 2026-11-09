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
  /** 학번(= MIRAEPASS user id)으로 학생 조회 */
  findStudent(studentId: number): Promise<MPUser | null>;
  /** 이름(부분 일치)으로 교사 후보 검색 */
  searchTeachers(name: string): Promise<MPUser[]>;
  /** 결제 직전 고객 재확인. 교사는 id 검색이 불가능하므로 이름으로 검색 후 id 매칭 */
  resolveCustomer(type: CustomerType, id: number, name?: string): Promise<MPUser | null>;
  /** 포인트 차감 → 남은 잔액 */
  deduct(userId: number, amount: number, memo: string): Promise<number>;
  /** 포인트 지급(환불) */
  grant(userId: number, amount: number, memo: string): Promise<void>;
  /** 관리자/직원 로그인 확인. 세션은 즉시 폐기 */
  verifyCredentials(id: number, password: string): Promise<MPUser>;
}
