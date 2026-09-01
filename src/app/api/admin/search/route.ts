import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) return NextResponse.json({ clients: [], chambres: [], paiements: [] });

  const [clients, chambres, paiements] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { telephone: { contains: q } },
          { profession: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.chambre.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { type_chambre: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.paiement.findMany({
      where: {
        OR: [
          { mois_paye: { contains: q } },
          { numero_recu: { contains: q } },
          { client: { nom: { contains: q } } },
          { client: { prenom: { contains: q } } },
        ],
      },
      include: { client: { select: { nom: true, prenom: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ clients, chambres, paiements });
}
