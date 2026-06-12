import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Resend } from "resend";

import { prisma } from "@distribution-copilot/database";

/** Days from signup until the trial expires. */
const TRIAL_DAYS = 3;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Distribution Copilot <noreply@distributioncopilot.com>";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[Email — no Resend key] To: ${to} | Subject: ${subject}`);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  baseURL: process.env.BETTER_AUTH_URL ?? "",
  trustedOrigins: [process.env.FRONTEND_URL ?? ""],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      await sendEmail(
        user.email,
        "Reset your password",
        `<p>Hi ${user.name},</p>
         <p>Click the link below to reset your password. This link expires in 1 hour.</p>
         <p><a href="${url}" style="font-weight:bold">Reset password</a></p>
         <p>If you didn't request this, you can safely ignore this email.</p>`,
      );
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      await sendEmail(
        user.email,
        "Verify your email address",
        `<p>Hi ${user.name},</p>
         <p>Click the link below to verify your email address and activate your account.</p>
         <p><a href="${url}" style="font-weight:bold">Verify email</a></p>
         <p>If you didn't create an account, you can ignore this email.</p>`,
      );
    },
    autoSignInAfterVerification: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user: { id: string }) => {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              status: "trialing",
              planName: "trial",
              trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            },
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
