import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

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
    const { id_client, id_contrat, mois_paye, montant } = body;
    const numero_recu = `REC-${Math.random().toString(16).slice(2,10).toUpperCase()}`;
    const ym = (() => {
      try { const [m,y] = mois_paye.split(' '); return `${y}-${(new Date(Date.parse(m + ' 1, 2000')).getMonth()+1).toString().padStart(2,'0')}` } catch { return null }
    })();
    const data: any = { id_client, id_contrat: id_contrat || null, date_paiement: new Date().toISOString().slice(0,10), mois_paye, mois_ym: ym, montant: parseFloat(montant), numero_recu };
    const created = await prisma.paiement.create({ data });
    return NextResponse.json({ paiement: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création paiement' }, { status: 500 });
  }
}
