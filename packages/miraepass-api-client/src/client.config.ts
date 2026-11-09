import type { CreateClientConfig } from './gen/client.gen';

// [miraepass-kiosk] 원본은 baseUrl '/api/' 고정. 키오스크 서버에서는 환경변수로 MIRAEPASS API 주소를 지정한다.
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.MIRAEPASS_API_URL ?? '/api/',
  integrity: ""
});
