import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id_user: true,
      nom: true,
      prenom: true,
      login: true,
      role: true,
    },
  });

  return NextResponse.json({ users });
}
