import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({ orderBy: { id_client: 'desc' } });
    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture clients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await prisma.client.create({ data: body });
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création client' }, { status: 500 });
  }
}
