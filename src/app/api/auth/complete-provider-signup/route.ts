import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";

/**
 * Post-auth redirect target for provider sign-up/login.
 * Runs in Node.js (not Edge) so we can use Prisma to set role "doctor".
 * Add this path to Auth0 Allowed Callback URLs.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  await prisma.user.upsert({
    where: { email: session.user.email },
    create: {
      email: session.user.email,
      name: session.user.name ?? null,
      role: "doctor",
    },
    update: { role: "doctor" },
  });

  return NextResponse.redirect(new URL("/doctor", process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
