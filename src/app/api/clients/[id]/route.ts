import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const client = await prisma.client.findUnique({
      where: { id_client: id },
      include: {
        chambre: true,
        contrats: {
          include: {
            contrat_chambres: {
              include: { chambre: true }
            }
          },
          orderBy: { id_contrat: "desc" }
        },
        paiements: {
          orderBy: { id_paiement: "desc" }
        }
      }
    });
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture client' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();

    if (body.statut === "Inactif") {
      const client = await prisma.client.findUnique({ where: { id_client: id } });
      if (client && client.id_chambre) {
        await prisma.chambre.update({
          where: { id_chambre: client.id_chambre },
          data: { statut: "Libre" }
        });
      }
      body.id_chambre = null;
    }

    const updated = await prisma.client.update({ where: { id_client: id }, data: body });
    return NextResponse.json({ client: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour client' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.client.delete({ where: { id_client: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression client' }, { status: 500 });
  }
}
