// Client-side BetterAuth (React). baseURL defaults to the current origin, so this works in
// both local dev and production without configuration.
"use client";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
