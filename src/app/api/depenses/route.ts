import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";
import { logAudit } from "../../../lib/audit";

export async function GET() {
  try {
    const depenses = await prisma.depense.findMany({ orderBy: { date_depense: 'desc' } });
    return NextResponse.json({ depenses });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture dépenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const libelle = typeof body.libelle === "string" ? body.libelle.trim() : "";
    const montant = Number(body.montant);
    const date_depense = body.date_depense ? new Date(body.date_depense) : new Date();
    if (!libelle || libelle.length > 255 || !Number.isFinite(montant) || montant <= 0 || Number.isNaN(date_depense.getTime())) {
      return NextResponse.json({ error: "Libellé, montant positif et date valide sont obligatoires" }, { status: 400 });
    }
    const created = await prisma.depense.create({
      data: {
        libelle,
        montant,
        date_depense,
      },
    });
    await logAudit("CREATION_DEPENSE", `Dépense #${created.id_depense} créée (${created.montant} GNF)`);
    return NextResponse.json({ depense: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création dépense' }, { status: 500 });
  }
}
