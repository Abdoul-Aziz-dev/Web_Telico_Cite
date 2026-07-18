import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const contrat = await prisma.contrat.findUnique({ where: { id_contrat: id }, include: { client: true, contrat_chambres: { include: { chambre: true } } } });
    if (!contrat) return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 });
    return NextResponse.json({ contrat });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture contrat' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.contrat.delete({ where: { id_contrat: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression contrat' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();

    if (body.date_fin) {
      const contractChambres = await prisma.contratChambre.findMany({
        where: { id_contrat: id }
      });
      
      for (const cc of contractChambres) {
        await prisma.chambre.update({
          where: { id_chambre: cc.id_chambre },
          data: { statut: "Libre" }
        });
      }

      const contrat = await prisma.contrat.findUnique({ where: { id_contrat: id } });
      if (contrat && contrat.id_client) {
        await prisma.client.update({
          where: { id_client: contrat.id_client },
          data: { statut: "Inactif", id_chambre: null }
        });
      }
    }

    const updated = await prisma.contrat.update({
      where: { id_contrat: id },
      data: body
    });
    return NextResponse.json({ contrat: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "Erreur mise à jour contrat: " + e.message }, { status: 500 });
  }
}
