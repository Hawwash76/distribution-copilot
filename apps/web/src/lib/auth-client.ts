import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847",
});

export const { signIn, signOut, signUp, useSession, resetPassword, updateUser, changePassword } =
  authClient;

/**
 * Calls the Better Auth `/forget-password` endpoint to send a password-reset email.
 * Typed manually because the client type inference requires the server auth type,
 * which we can't import here without violating the web↔api boundary.
 */
export async function forgotPassword(params: {
  email: string;
  redirectTo: string;
}): Promise<{ data: null; error: { message: string } | null }> {
  return authClient.$fetch("/forget-password", {
    method: "POST",
    body: params,
  }) as Promise<{ data: null; error: { message: string } | null }>;
}

/** @deprecated Use forgotPassword instead */
export const forgetPassword = forgotPassword;
