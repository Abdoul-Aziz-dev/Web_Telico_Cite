import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { monthYearToYm } from "../../../../lib/dates";
import { logAudit } from "../../../../lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const paiement = await prisma.paiement.findUnique({ where: { id_paiement: id }, include: { client: true } });
    if (!paiement) return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 });
    return NextResponse.json({ paiement });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture paiement' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const body = await req.json();
    const id_client = Number(body.id_client);
    const montant = Number(body.montant);
    const mois_paye = typeof body.mois_paye === "string" ? body.mois_paye.trim() : "";
    const mois_ym = monthYearToYm(mois_paye);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(id_client) || id_client <= 0 || !Number.isFinite(montant) || montant <= 0 || !mois_ym) {
      return NextResponse.json({ error: "Données de paiement invalides" }, { status: 400 });
    }
    const existing = await prisma.paiement.findUnique({ where: { id_paiement: id }, select: { id_contrat: true } });
    if (!existing) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    const contract = existing.id_contrat
      ? await prisma.contrat.findFirst({ where: { id_contrat: existing.id_contrat, id_client }, select: { id_contrat: true } })
      : null;
    const updated = await prisma.paiement.update({
      where: { id_paiement: id },
      data: { id_client, id_contrat: contract?.id_contrat ?? null, mois_paye, mois_ym, montant },
    });
    await logAudit("MODIFICATION_PAIEMENT", `Paiement #${id} modifié`);
    return NextResponse.json({ paiement: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur modification paiement' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    await prisma.paiement.delete({ where: { id_paiement: id } });
    await logAudit("SUPPRESSION_PAIEMENT", `Paiement #${id} supprimé`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression paiement' }, { status: 500 });
  }
}
