// BetterAuth instance. Magic-link only — no email/password, no OAuth.
// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment automatically.
import { betterAuth } from "better-auth"
import { magicLink } from "better-auth/plugins"
import { pool } from "./db"
import { sendMagicLinkEmail } from "./email"

// Origins allowed to initiate auth requests (CSRF protection). BETTER_AUTH_URL is trusted
// automatically; we add the production domains and Vercel preview/production URLs explicitly.
const trustedOrigins = [
  "http://localhost:3000",
  "https://worldcup2026predictions.app",
  "https://www.worldcup2026predictions.app",
  "https://*.vercel.app",
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
    : []),
]

export const auth = betterAuth({
  database: pool, // node-postgres Pool -> BetterAuth uses its built-in Kysely adapter
  trustedOrigins,
  plugins: [
    magicLink({
      expiresIn: 60 * 15, // 15 minutes
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url)
      },
    }),
  ],
})
