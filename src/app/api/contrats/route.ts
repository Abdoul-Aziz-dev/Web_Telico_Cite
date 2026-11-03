import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";
import { logAudit } from "../../../lib/audit";

export async function GET() {
  try {
    const contrats = await prisma.contrat.findMany({
      orderBy: { id_contrat: 'desc' },
      include: { client: true, contrat_chambres: { include: { chambre: true } } }
    });
    return NextResponse.json({ contrats });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture contrats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id_client = Number(body.id_client);
    const chambreIds = Array.isArray(body.chambreIds) ? body.chambreIds.map(Number) : [];
    const montant = Number(body.montant);
    const date_debut = new Date(body.date_debut);
    const date_fin = body.date_fin ? new Date(body.date_fin) : null;
    if (
      !Number.isInteger(id_client) || id_client <= 0 ||
      chambreIds.length === 0 || chambreIds.some((id: number) => !Number.isInteger(id) || id <= 0) ||
      new Set(chambreIds).size !== chambreIds.length ||
      !Number.isFinite(montant) || montant <= 0 ||
      Number.isNaN(date_debut.getTime()) || date_fin && Number.isNaN(date_fin.getTime())
    ) {
      return NextResponse.json({ error: "Données de contrat invalides" }, { status: 400 });
    }

    const contrat = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id_client } });
      if (!client) throw new Error("Locataire introuvable");
      const chambresLibres = await tx.chambre.findMany({
        where: { id_chambre: { in: chambreIds }, statut: "Libre" },
        select: { id_chambre: true },
      });
      if (chambresLibres.length !== chambreIds.length) throw new Error("Une ou plusieurs chambres ne sont plus libres");

      const created = await tx.contrat.create({
        data: { id_client, date_debut, date_fin, montant },
      });
      await tx.contratChambre.createMany({
        data: chambreIds.map((id_chambre: number) => ({ id_contrat: created.id_contrat, id_chambre })),
      });
      const occupied = await tx.chambre.updateMany({
        where: { id_chambre: { in: chambreIds }, statut: "Libre" },
        data: { statut: "Occupée" },
      });
      if (occupied.count !== chambreIds.length) throw new Error("Une chambre vient d'être attribuée");
      await tx.client.update({
        where: { id_client },
        data: {
          statut: "Actif",
          id_chambre: chambreIds[0],
          date_entree: client.statut === "Inactif" ? date_debut : client.date_entree,
        },
      });
      return created;
    });
    await logAudit("CREATION_CONTRAT", `Contrat #${contrat.id_contrat} créé pour le locataire #${id_client}`);
    return NextResponse.json({ contrat }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("introuvable") ? 404 : message.includes("chambre") || message.includes("chambres") ? 409 : 500;
    return NextResponse.json({ error: `Erreur création contrat: ${message}` }, { status });
  }
}
