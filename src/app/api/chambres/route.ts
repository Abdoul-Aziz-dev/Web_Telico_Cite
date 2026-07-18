import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const chambres = await prisma.chambre.findMany({ orderBy: { id_chambre: 'asc' } });
    return NextResponse.json({ chambres });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture chambres' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await prisma.chambre.create({ data: body });
    return NextResponse.json({ chambre: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création chambre' }, { status: 500 });
  }
}
