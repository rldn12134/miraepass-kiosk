# 미래카페 키오스크

순천미래과학고등학교 교내 카페용 주문·결제 시스템입니다. 결제는 학교 자체 포인트인 **MIRAEPASS**로 합니다.

| 화면 | 경로 | 사용 기기 | 설명 |
|---|---|---|---|
| 키오스크 | `/kiosk` | 주문용 태블릿 | 메뉴 선택 → 주문 확인 → 학번/선생님 이름 → 결제 비밀번호 → MIRAEPASS 결제 → 주문 완료 |
| 주문 처리 | `/staff` | 직원용 태블릿 | 실시간 주문 수신, 접수/제조/픽업 처리, 취소(자동 환불), 품절 관리, 음성 호출 |
| 관리자 | `/admin` | PC·태블릿 | 매출 대시보드, 메뉴·옵션 등록, 주문 기록(CSV), 영업시간·음성·키오스크 설정 |

모든 화면은 태블릿을 기준으로 만들었고, 데스크톱과 모바일에서도 쓸 수 있습니다.

## 기술 스택

- **Next.js 16 (App Router)** + TypeScript, 커스텀 서버(`server.ts`)
- **Tailwind CSS v4 + shadcn/ui + Magic UI**: MIRAEPASS 브랜드 톤(Pretendard, blue, slate-100)
- **상태 관리**
  - 서버 상태(메뉴, 주문, 통계, 설정): **TanStack React Query**
  - 클라이언트 상태(장바구니, 키오스크 단계, 직원 기기별 설정): **Jotai** (`store/`)
- **실시간 통신**: Socket.IO (`order:new`, `order:updated`, `order:call`, `menu:changed`, `store:changed`)
- **DB**: SQLite + Drizzle ORM (`data/cafe.db`, 서버를 켤 때 마이그레이션 자동 적용)
- **MIRAEPASS SDK**: [MIRAE-PASS](https://github.com/scfs-miraepass/MIRAE-PASS)의 `api-client`를 `packages/miraepass-api-client`로 복사해 사용

> Recoil은 Meta에서 보관(archived) 처리됐고 React 19와 호환되지 않아서, 같은 atom 모델인 Jotai로 대체했습니다.

## 시작하기

```bash
yarn install
cp .env.example .env     # 값 수정
yarn dev                 # http://localhost:3000
```

`MIRAEPASS_MOCK=1`이면 실제 MIRAEPASS 대신 모의 데이터로 동작합니다.

| 용도 | ID | 비밀번호 / 비고 |
|---|---|---|
| 관리자 | 9001 | `admin` |
| 직원 | 9002 | `staff` |
| 학생 | 10101, 10215, 20307, 30512, 30101 | 30101은 잔액 0P |
| 교사 | 이름 검색: 홍길동, 홍길순, 김선생 | |

키오스크를 처음 열면 기기 토큰(`KIOSK_DEVICE_TOKEN`)을 입력합니다.

### 운영 배포

```bash
yarn build
yarn start               # NODE_ENV=production, PORT 기본 3000
```

- 키오스크·직원 태블릿은 같은 네트워크에서 `http://<서버IP>:3000/kiosk`, `/staff`로 접속합니다.
- 브라우저의 키오스크 모드나 전체화면, 또는 홈 화면에 추가해서 사용하는 것을 권장합니다.
- `data/` 폴더(DB, 업로드한 메뉴 이미지)는 꼭 백업하세요.
- 로그인 쿠키의 `Secure`는 HTTPS로 접속했을 때만 자동으로 붙습니다(리버스 프록시의 `X-Forwarded-Proto` 포함). 그래서 `http://서버IP` 로 접속하는 태블릿에서도 로그인이 유지됩니다.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `MIRAEPASS_API_URL` | MIRAEPASS API 주소 |
| `MIRAEPASS_SERVICE_ID` / `MIRAEPASS_SERVICE_PASSWORD` | 결제용 서비스 계정. **DEDUCT_POINT**(결제)와 **GRANT_POINT**(취소 환불) 권한이 필요합니다 |
| `MIRAEPASS_MOCK` | `1`이면 모의 모드 |
| `ADMIN_USER_IDS` / `STAFF_USER_IDS` | 관리자·직원으로 로그인할 수 있는 MIRAEPASS ID 목록(쉼표로 구분) |
| `SESSION_SECRET` | 세션 암호화 키(32자 이상) |
| `KIOSK_DEVICE_TOKEN` | 키오스크 기기 등록 토큰 |
| `DATABASE_PATH`, `UPLOAD_DIR` | 기본값은 `./data/cafe.db`, `./data/uploads` |

## 결제 흐름

1. 키오스크가 `POST /api/orders`를 호출합니다(멱등키 포함).
2. 서버가 DB 기준으로 가격과 옵션을 다시 계산하고 영업 상태를 확인합니다.
3. MIRAEPASS에서 고객을 다시 조회해 이름과 학년을 확보한 뒤 주문을 `pending_payment` 상태로 저장합니다.
4. 서비스 계정으로 `/point/deduct`를 호출합니다(`change_type: cafe`).
5. 결제에 성공하면 그날의 주문번호를 부여하고, 직원 기기에 `order:new`를 보내며 "주문이 들어왔어요" 음성 알림이 나갑니다.
6. 직원이 **제조 완료**를 누르면 `order:call`이 나가고 "3학년 홍길동님, 주문하신 음료가 나왔습니다"라고 호출합니다.
7. 직원이 주문을 취소하면 `/point/grant`로 자동 환불합니다. 환불에 실패하면 `refund_failed`로 표시되고, 관리자 화면에서 다시 시도할 수 있습니다.

**결제 비밀번호**는 MIRAEPASS에서 아직 개발 중이라 지금은 UI만 있습니다. API가 나오면 `lib/payment-pin.ts`의 `verifyPaymentPin()`만 바꾸면 됩니다.

## 음성 호출

- 직원 기기의 브라우저 Web Speech API(ko-KR)를 사용합니다.
- 브라우저 정책 때문에 직원 화면을 연 뒤 "음성 알림 켜기"를 한 번 눌러야 소리가 납니다.
- 새 주문 알림과 픽업 호출은 **기기별로** 켜고 끌 수 있습니다(상단 스피커 아이콘). 카운터 스피커에 연결된 기기에서만 호출을 켜 두세요.
- 안내 문구는 관리자 › 설정 › 음성 호출에서 바꿀 수 있습니다(`{name}`, `{grade}`, `{orderNo}`, `{menu}`).

## 개발

```bash
yarn typecheck     # tsc
yarn lint          # eslint
yarn test          # vitest (가격 계산, 영업시간, 포맷)
yarn db:generate   # 스키마를 바꾼 뒤 마이그레이션 생성
```

```
app/                 페이지와 API Route Handler
components/kiosk     키오스크 화면 (단계별 컴포넌트)
components/staff     주문 처리 화면
components/admin     관리자 화면
components/ui        shadcn/ui + Magic UI (CLI로 생성)
lib/                 도메인 로직 (orders, pricing, store-hours, miraepass, db …)
store/               Jotai atoms
packages/miraepass-api-client  MIRAEPASS SDK (원본 그대로, src/gen은 수정 금지)
server.ts            Next + Socket.IO 커스텀 서버
```
