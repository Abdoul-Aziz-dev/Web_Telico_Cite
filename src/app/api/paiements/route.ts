import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";
import { monthYearToYm } from "../../../lib/dates";
import { logAudit } from "../../../lib/audit";

export async function GET() {
  try {
    const paiements = await prisma.paiement.findMany({ orderBy: { id_paiement: 'desc' }, include: { client: true } });
    return NextResponse.json({ paiements });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture paiements' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id_client = Number(body.id_client);
    const id_contrat = body.id_contrat ? Number(body.id_contrat) : null;
    const montant = Number(body.montant);
    const mois_paye = typeof body.mois_paye === "string" ? body.mois_paye.trim() : "";
    const mois_ym = monthYearToYm(mois_paye);
    if (!Number.isInteger(id_client) || id_client <= 0 || !Number.isFinite(montant) || montant <= 0 || !mois_ym) {
      return NextResponse.json({ error: "Locataire, mois et montant valide sont obligatoires" }, { status: 400 });
    }
    if (id_contrat !== null) {
      const contract = await prisma.contrat.findFirst({ where: { id_contrat, id_client } });
      if (!contract) return NextResponse.json({ error: "Contrat introuvable pour ce locataire" }, { status: 400 });
    }
    const numero_recu = `REC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const created = await prisma.paiement.create({
      data: { id_client, id_contrat, date_paiement: new Date(), mois_paye, mois_ym, montant, numero_recu },
    });
    await logAudit("CREATION_PAIEMENT", `Paiement #${created.id_paiement} créé (${montant} GNF, ${mois_ym})`);
    return NextResponse.json({ paiement: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur création paiement: ${message}` }, { status: 500 });
  }
}
