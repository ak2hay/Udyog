import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, users, sessions, accounts, verifications } from "@rkyves/db";
import { sendPlatformEmail } from "./smtp";

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Localhost ports Next may auto-bump to when 3000 is taken */
const LOCAL_DEV_ORIGINS = Array.from({ length: 21 }, (_, i) => `http://localhost:${3000 + i}`);

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [
    ...new Set([
      baseURL,
      process.env.NEXT_PUBLIC_APP_URL,
      ...LOCAL_DEV_ORIGINS,
    ].filter(Boolean) as string[]),
  ],
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPlatformEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password using this link:\n\n${url}\n\nIf you did not request this, ignore this email.`,
      });
    },
  },
  user: {
    additionalFields: {},
  },
});

export type Session = typeof auth.$Infer.Session;
