# @miraepass/api-client (vendored)

[scfs-miraepass/MIRAE-PASS](https://github.com/scfs-miraepass/MIRAE-PASS) 의 `api-client` 를 그대로 복사한 패키지입니다.

- 원본 커밋: `b83a7d47975e16a535216f1618eab215bf45da64`
- `src/gen/**` 는 자동 생성 코드이므로 수정하지 않습니다. 업데이트 시 원본에서 다시 복사하세요.
- 변경점
  - `src/client.config.ts`: `baseUrl` 을 `MIRAEPASS_API_URL` 환경변수로 지정
  - `package.json`: yarn catalog 의존성을 버전으로 치환, `./client` export 추가
