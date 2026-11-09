import { mockGateway } from "./mock";
import { realGateway } from "./real";
import type { MiraepassGateway } from "./types";

export const isMockMode = () => process.env.MIRAEPASS_MOCK === "1";

export function miraepass(): MiraepassGateway {
  return isMockMode() ? mockGateway : realGateway;
}

export * from "./types";
