import { MiraepassError, type MiraepassGateway, type MPUser } from "./types";

/**
 * MIRAEPASS_MOCK=1 일 때 쓰는 인메모리 구현. 서버를 다시 시작하면 초기화된다.
 * ID 규칙: 학생은 학번 4자리(3학년 4반 12번 → 3412), 교사는 고유 4자리.
 * 키오스크 비밀번호는 모두 123456 (3105만 미설정).
 */
type MockUser = MPUser & { password?: string; kioskPin?: string };

const PIN = "123456";

const seed: MockUser[] = [
  { id: 1101, type: "student", name: "김미래", grade: 1, classNo: 1, point: 3000, kioskPin: PIN },
  { id: 1215, type: "student", name: "이과학", grade: 1, classNo: 2, point: 800, kioskPin: PIN },
  { id: 2307, type: "student", name: "박순천", grade: 2, classNo: 3, point: 5200, kioskPin: PIN },
  { id: 3412, type: "student", name: "최코딩", grade: 3, classNo: 4, point: 12000, kioskPin: PIN },
  { id: 3101, type: "student", name: "정잔액", grade: 3, classNo: 1, point: 0, kioskPin: PIN },
  { id: 3105, type: "student", name: "한미설", grade: 3, classNo: 1, point: 5000 },
  { id: 4001, type: "teacher", name: "홍길동", grade: null, classNo: null, point: 20000, password: "1234", kioskPin: PIN },
  { id: 4002, type: "teacher", name: "김선생", grade: null, classNo: null, point: 9000, password: "1234", kioskPin: PIN },
  { id: 9001, type: "teacher", name: "카페관리자", grade: null, classNo: null, point: 0, password: "admin" },
  { id: 9002, type: "teacher", name: "카페직원", grade: null, classNo: null, point: 0, password: "staff" },
];

declare global {
  var __mpMockUsers: Map<number, MockUser> | undefined;
}
const users = (globalThis.__mpMockUsers ??= new Map(seed.map((u) => [u.id, { ...u }])));

const latency = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
const strip = ({ password: _password, kioskPin: _pin, ...u }: MockUser): MPUser => ({ ...u });

export const mockGateway: MiraepassGateway = {
  async findUser(id) {
    await latency();
    const u = users.get(id);
    return u && (u.type === "student" || u.type === "teacher") ? strip(u) : null;
  },
  async verifyKioskPin(id, pin) {
    await latency();
    const u = users.get(id);
    if (!u) throw new MiraepassError("USER_NOT_FOUND", "사용자를 찾을 수 없어요", 404);
    if (!u.kioskPin) throw new MiraepassError("PIN_NOT_SET", "키오스크 비밀번호가 설정되지 않았어요", 400);
    return u.kioskPin === pin;
  },
  async deduct(userId, amount) {
    await latency();
    const u = users.get(userId);
    if (!u) throw new MiraepassError("USER_NOT_FOUND", "사용자를 찾을 수 없어요", 404);
    if ((u.point ?? 0) < amount) throw new MiraepassError("INSUFFICIENT_POINT", "포인트가 부족해요", 400);
    u.point = (u.point ?? 0) - amount;
    return u.point;
  },
  async grant(userId, amount) {
    await latency();
    const u = users.get(userId);
    if (!u) throw new MiraepassError("USER_NOT_FOUND", "사용자를 찾을 수 없어요", 404);
    u.point = (u.point ?? 0) + amount;
  },
  async verifyCredentials(id, password) {
    await latency();
    const u = users.get(id);
    if (!u || !u.password || u.password !== password) {
      throw new MiraepassError("INVALID_CREDENTIALS", "ID 또는 비밀번호가 일치하지 않아요", 401);
    }
    return strip(u);
  },
};
