import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { id_client: 'desc' },
      include: {
        chambre: { select: { id_chambre: true, numero: true, type_chambre: true, prix: true, statut: true } },
        _count: { select: { contrats: true, paiements: true } }
      }
    });
    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture clients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Normalize date_entree so Prisma DateTime receives a JS Date
    const data: any = { ...body };
    if (data.date_entree) {
      try {
        data.date_entree = new Date(data.date_entree);
      } catch {
        data.date_entree = new Date();
      }
    } else {
      data.date_entree = new Date();
    }

    const created = await prisma.client.create({ data });
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création client' }, { status: 500 });
  }
}
