import { z } from "zod";

/**
 * Placeholder user schema. Mirrors the minimal Prisma `User` model.
 * Extend with real fields (roles, plan, settings, …) as auth lands.
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;
