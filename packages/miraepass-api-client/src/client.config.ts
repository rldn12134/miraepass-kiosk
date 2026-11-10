import type { CreateClientConfig } from './gen/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.MIRAEPASS_API_URL ?? '/api/',
  integrity: ""
});