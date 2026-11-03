import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../prisma/client";
import { monthYearToYm } from "../../../lib/dates";
import { verifySessionToken } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

async function buildMonthlyReport(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const [contracts, payments, expenses] = await Promise.all([
    prisma.contrat.findMany({
      where: {
        date_debut: { lt: end },
        OR: [{ date_fin: null }, { date_fin: { gte: start } }],
      },
      select: { montant: true },
    }),
    prisma.paiement.findMany({
      where: {
        statut: "Complet",
        OR: [{ mois_ym: ym }, { mois_ym: null, mois_paye: { contains: String(year) } }],
      },
      select: { mois_ym: true, mois_paye: true, montant: true },
    }),
    prisma.depense.aggregate({
      where: { date_depense: { gte: start, lt: end } },
      _sum: { montant: true },
    }),
  ]);
  const total_du = contracts.reduce((total, contract) => total + contract.montant, 0);
  const total_encaisse = payments
    .filter((payment) => payment.mois_ym === ym || monthYearToYm(payment.mois_paye) === ym)
    .reduce((total, payment) => total + payment.montant, 0);
  const total_depense = expenses._sum.montant ?? 0;
  return { mois: ym, total_du, total_encaisse, total_depense, solde: total_encaisse - total_depense };
}

export async function GET(req: Request) {
  try {
    const ym = new URL(req.url).searchParams.get("mois");
    if (ym) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
        return NextResponse.json({ error: "Mois invalide" }, { status: 400 });
      }
      return NextResponse.json({ report: await buildMonthlyReport(ym) });
    }
    const clotures = await prisma.cloture.findMany({ orderBy: { date_cloture: 'desc' } });
    return NextResponse.json({ clotures });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture clôtures' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await verifySessionToken(cookies().get("user_session")?.value);
    if (!user || user.role !== "gerant") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const mois = typeof body.mois === "string" ? body.mois.trim() : "";
    const ym = monthYearToYm(mois);
    if (!ym) return NextResponse.json({ error: "Choisissez un mois valide" }, { status: 400 });
    const report = await buildMonthlyReport(ym);
    const created = await prisma.cloture.create({
      data: {
        ...report,
        date_cloture: new Date(),
        statut: "Validé",
        valide_par: user.login,
        commentaire: typeof body.commentaire === "string" ? body.commentaire.slice(0, 2000) : null,
      },
    });
    await logAudit("CLOTURE_MENSUELLE", `Clôture ${ym} créée`);
    return NextResponse.json({ cloture: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("Unique constraint") ? 409 : 500;
    return NextResponse.json({ error: `Erreur création clôture: ${message}` }, { status });
  }
}
