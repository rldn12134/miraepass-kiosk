import { MiraepassError, type MiraepassGateway, type MPUser } from "./types";

/** MIRAEPASS_MOCK=1 일 때 쓰는 인메모리 구현. 서버 재시작 시 초기화된다. */
type MockUser = MPUser & { password?: string };

const seed: MockUser[] = [
  { id: 10101, type: "student", name: "김미래", grade: 1, classNo: 1, point: 3000 },
  { id: 10215, type: "student", name: "이과학", grade: 1, classNo: 2, point: 800 },
  { id: 20307, type: "student", name: "박순천", grade: 2, classNo: 3, point: 5200 },
  { id: 30512, type: "student", name: "최코딩", grade: 3, classNo: 5, point: 12000 },
  { id: 30101, type: "student", name: "정잔액", grade: 3, classNo: 1, point: 0 },
  { id: 1001, type: "teacher", name: "홍길동", grade: null, classNo: null, point: 20000, password: "1234" },
  { id: 1002, type: "teacher", name: "홍길순", grade: null, classNo: null, point: 15000, password: "1234" },
  { id: 1003, type: "teacher", name: "김선생", grade: null, classNo: null, point: 9000, password: "1234" },
  { id: 9001, type: "teacher", name: "카페관리자", grade: null, classNo: null, point: 0, password: "admin" },
  { id: 9002, type: "teacher", name: "카페직원", grade: null, classNo: null, point: 0, password: "staff" },
];

declare global {
  var __mpMockUsers: Map<number, MockUser> | undefined;
}
const users = (globalThis.__mpMockUsers ??= new Map(seed.map((u) => [u.id, { ...u }])));

const latency = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
const strip = ({ password: _password, ...u }: MockUser): MPUser => ({ ...u });

export const mockGateway: MiraepassGateway = {
  async findStudent(studentId) {
    await latency();
    const u = users.get(studentId);
    return u && u.type === "student" ? strip(u) : null;
  },
  async searchTeachers(name) {
    await latency();
    const q = name.trim();
    if (!q) return [];
    return [...users.values()].filter((u) => u.type === "teacher" && u.name.includes(q)).map(strip);
  },
  async resolveCustomer(type, id) {
    await latency();
    const u = users.get(id);
    return u && u.type === type ? strip(u) : null;
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
