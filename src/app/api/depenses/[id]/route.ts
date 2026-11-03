import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { logAudit } from "../../../../lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const depense = await prisma.depense.findUnique({ where: { id_depense: id } });
    if (!depense) return NextResponse.json({ error: 'Depense non trouvee' }, { status: 404 });
    return NextResponse.json({ depense });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture depense' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const body = await req.json();
    const libelle = typeof body.libelle === "string" ? body.libelle.trim() : "";
    const montant = Number(body.montant);
    const date_depense = new Date(body.date_depense);
    if (!libelle || libelle.length > 255 || !Number.isFinite(montant) || montant <= 0 || Number.isNaN(date_depense.getTime())) {
      return NextResponse.json({ error: "Libellé, montant positif et date valide sont obligatoires" }, { status: 400 });
    }
    const updated = await prisma.depense.update({
      where: { id_depense: id },
      data: {
        libelle,
        montant,
        date_depense,
      },
    });
    await logAudit("MODIFICATION_DEPENSE", `Dépense #${id} modifiée`);
    return NextResponse.json({ depense: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise a jour depense' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    await prisma.depense.delete({ where: { id_depense: id } });
    await logAudit("SUPPRESSION_DEPENSE", `Dépense #${id} supprimée`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression depense' }, { status: 500 });
  }
}
