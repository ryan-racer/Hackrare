import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPasswordForRegister } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  role: z.enum(["patient", "doctor"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = schema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    const passwordHash = await hashPasswordForRegister(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null, role },
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
