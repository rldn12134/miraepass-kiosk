import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./session-core";

export * from "./session-core";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
