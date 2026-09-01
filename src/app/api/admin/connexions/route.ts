import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET() {
  try {
    const logs = await prisma.connexionLog.findMany({
      orderBy: { date_connexion: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json({ error: "Erreur lecture connexions" }, { status: 500 });
  }
}
