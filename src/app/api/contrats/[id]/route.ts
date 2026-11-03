import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { logAudit } from "../../../../lib/audit";

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
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const paymentCount = await prisma.paiement.count({ where: { id_contrat: id } });
    if (paymentCount) return NextResponse.json({ error: "Ce contrat possède des paiements; résiliez-le pour conserver l'historique." }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      const contract = await tx.contrat.findUnique({
        where: { id_contrat: id },
        include: { contrat_chambres: true },
      });
      if (!contract) throw new Error("Contrat introuvable");
      await tx.contratChambre.deleteMany({ where: { id_contrat: id } });
      await tx.contrat.delete({ where: { id_contrat: id } });
      for (const relation of contract.contrat_chambres) {
        const stillRented = await tx.contratChambre.findFirst({
          where: {
            id_chambre: relation.id_chambre,
            contrat: { OR: [{ date_fin: null }, { date_fin: { gte: new Date() } }] },
          },
        });
        if (!stillRented) await tx.chambre.update({ where: { id_chambre: relation.id_chambre }, data: { statut: "Libre" } });
      }
      const anotherActiveContract = await tx.contrat.findFirst({
        where: {
          id_client: contract.id_client,
          OR: [{ date_fin: null }, { date_fin: { gte: new Date() } }],
        },
      });
      if (!anotherActiveContract) {
        await tx.client.update({
          where: { id_client: contract.id_client },
          data: { statut: "Inactif", id_chambre: null },
        });
      }
    });
    await logAudit("SUPPRESSION_CONTRAT", `Contrat #${id} supprimé`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur suppression contrat: ${message}` }, { status: message.includes("introuvable") ? 404 : 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const body = await req.json();

    if (body.date_fin) {
      const date_fin = new Date(body.date_fin);
      if (Number.isNaN(date_fin.getTime())) return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
      const updated = await prisma.$transaction(async (tx) => {
        const contract = await tx.contrat.findUnique({
          where: { id_contrat: id },
          include: { contrat_chambres: true },
        });
        if (!contract) throw new Error("Contrat introuvable");
        const saved = await tx.contrat.update({ where: { id_contrat: id }, data: { date_fin } });
        for (const relation of contract.contrat_chambres) {
          const stillRented = await tx.contratChambre.findFirst({
            where: {
              id_chambre: relation.id_chambre,
              contrat: {
                id_contrat: { not: id },
                OR: [{ date_fin: null }, { date_fin: { gte: date_fin } }],
              },
            },
          });
          if (!stillRented) await tx.chambre.update({ where: { id_chambre: relation.id_chambre }, data: { statut: "Libre" } });
        }
        const otherActiveContract = await tx.contrat.findFirst({
          where: {
            id_client: contract.id_client,
            id_contrat: { not: id },
            OR: [{ date_fin: null }, { date_fin: { gte: date_fin } }],
          },
        });
        if (!otherActiveContract) {
          await tx.client.update({ where: { id_client: contract.id_client }, data: { statut: "Inactif", id_chambre: null } });
        }
        return saved;
      });
      await logAudit("RESILIATION_CONTRAT", `Contrat #${id} résilié`);
      return NextResponse.json({ contrat: updated });
    }

    const updated = await prisma.contrat.update({
      where: { id_contrat: id },
      data: {
        ...(body.montant !== undefined ? { montant: Number(body.montant) } : {}),
        ...(body.date_debut !== undefined ? { date_debut: new Date(body.date_debut) } : {}),
      }
    });
    await logAudit("MODIFICATION_CONTRAT", `Contrat #${id} modifié`);
    return NextResponse.json({ contrat: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur mise à jour contrat: ${message}` }, { status: message.includes("introuvable") ? 404 : 500 });
  }
}
