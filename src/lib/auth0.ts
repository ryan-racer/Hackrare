import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { assignDefaultJournalToPatient } from "@/lib/journal/assign-default";
import type { User as PrismaUser } from "@prisma/client";

export const auth0 = new Auth0Client();

export type SessionWithUser = {
  email: string | null;
  name: string | null;
  user: PrismaUser;
};

/**
 * Get Auth0 session and the corresponding local User (by email).
 * Creates a User with role "patient" if none exists (e.g. first Auth0 login).
 * Use in Server Components with no args; pass request in Route Handlers.
 */
export async function getSessionWithUser(
  request?: NextRequest | Request
): Promise<SessionWithUser | null> {
  const session = request
    ? await auth0.getSession(request as NextRequest)
    : await auth0.getSession();
  if (!session?.user?.email) return null;

  const email = session.user.email;
  let dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email,
        name: session.user.name ?? null,
        role: "patient",
      },
    });
    try {
      await assignDefaultJournalToPatient(dbUser.id);
    } catch (e) {
      console.error("Failed to assign default journal to new patient:", e);
    }
  }
  return {
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    user: dbUser,
  };
}
