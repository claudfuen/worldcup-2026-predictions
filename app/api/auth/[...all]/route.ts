// Mounts all BetterAuth endpoints (sign-in, magic-link verify, session, sign-out) under /api/auth/*.
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs"; // pg + BetterAuth need the Node runtime, not edge

export const { GET, POST } = toNextJsHandler(auth);
