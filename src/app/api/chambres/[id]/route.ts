import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { logAudit } from "../../../../lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const chambre = await prisma.chambre.findUnique({ where: { id_chambre: id } });
    if (!chambre) return NextResponse.json({ error: 'Chambre non trouvée' }, { status: 404 });
    return NextResponse.json({ chambre });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture chambre' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const body = await req.json();
    const room = await prisma.chambre.findUnique({ where: { id_chambre: id } });
    if (!room) return NextResponse.json({ error: "Chambre non trouvée" }, { status: 404 });
    const data: { numero?: string; type_chambre?: string; prix?: number; photo?: string | null } = {};
    if (body.numero !== undefined) {
      if (typeof body.numero !== "string" || !body.numero.trim()) return NextResponse.json({ error: "Numéro invalide" }, { status: 400 });
      data.numero = body.numero.trim();
    }
    if (body.type_chambre !== undefined) {
      if (typeof body.type_chambre !== "string" || !body.type_chambre.trim()) return NextResponse.json({ error: "Type de chambre invalide" }, { status: 400 });
      data.type_chambre = body.type_chambre.trim();
    }
    if (body.prix !== undefined) {
      const prix = Number(body.prix);
      if (!Number.isFinite(prix) || prix <= 0) return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
      data.prix = prix;
    }
    if (body.photo !== undefined) data.photo = typeof body.photo === "string" && body.photo ? body.photo : null;

    if (body.statut !== undefined && body.statut !== room.statut && body.statut !== "Libre") {
      return NextResponse.json({ error: "Une chambre occupée doit être affectée par un contrat" }, { status: 400 });
    }
    const updated = body.statut === "Libre" && room.statut !== "Libre"
      ? await prisma.$transaction(async (tx) => {
          const occupants = await tx.client.findMany({
            where: { id_chambre: id, statut: "Actif" },
            select: { id_client: true },
          });
          for (const occupant of occupants) {
            const activeContracts = await tx.contrat.findMany({
              where: {
                id_client: occupant.id_client,
                OR: [{ date_fin: null }, { date_fin: { gte: new Date() } }],
              },
              include: { contrat_chambres: true },
            });
            for (const contract of activeContracts) {
              await tx.contrat.update({ where: { id_contrat: contract.id_contrat }, data: { date_fin: new Date() } });
              for (const relation of contract.contrat_chambres) {
                const anotherActiveContract = await tx.contratChambre.findFirst({
                  where: {
                    id_chambre: relation.id_chambre,
                    id_contrat: { not: contract.id_contrat },
                    contrat: { OR: [{ date_fin: null }, { date_fin: { gte: new Date() } }] },
                  },
                });
                if (!anotherActiveContract) {
                  await tx.chambre.update({ where: { id_chambre: relation.id_chambre }, data: { statut: "Libre" } });
                }
              }
            }
            await tx.client.update({
              where: { id_client: occupant.id_client },
              data: { statut: "Inactif", id_chambre: null },
            });
          }
          return tx.chambre.update({ where: { id_chambre: id }, data: { ...data, statut: "Libre" } });
        })
      : await prisma.chambre.update({ where: { id_chambre: id }, data });
    await logAudit(body.statut === "Libre" && room.statut !== "Libre" ? "LIBERATION_CHAMBRE" : "MODIFICATION_CHAMBRE", `Chambre #${id} mise à jour`);
    return NextResponse.json({ chambre: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur mise à jour chambre: ${message}` }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    await prisma.chambre.delete({ where: { id_chambre: id } });
    await logAudit("SUPPRESSION_CHAMBRE", `Chambre #${id} supprimée`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Suppression impossible: la chambre est peut-être liée à un contrat ou un locataire. ${message}` }, { status: 409 });
  }
}
