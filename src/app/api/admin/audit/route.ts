import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { date_action: "desc" },
      take: 500,
    });
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json({ error: "Erreur lecture audit" }, { status: 500 });
  }
}
