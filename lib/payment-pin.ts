/**
 * 결제 비밀번호 확인.
 * MIRAEPASS의 결제 비밀번호 기능은 아직 개발 중이라 지금은 UI만 제공하고 항상 통과시킨다.
 * API가 공개되면 여기서 서버 라우트(→ MIRAEPASS)를 호출하도록 바꾸면 된다.
 */
export async function verifyPaymentPin(_customerId: number, pin: string): Promise<boolean> {
  return pin.length === 6;
}
