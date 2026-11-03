import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";
import { logAudit } from "../../../lib/audit";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { id_client: 'desc' },
      include: {
        chambre: { select: { id_chambre: true, numero: true, type_chambre: true, prix: true, statut: true } },
        _count: { select: { contrats: true, paiements: true } }
      }
    });
    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture clients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
    const sexe = typeof body.sexe === "string" ? body.sexe : "";
    const date_entree = body.date_entree ? new Date(body.date_entree) : new Date();
    if (!nom || !prenom || !["M", "F"].includes(sexe) || Number.isNaN(date_entree.getTime()) || body.id_chambre) {
      return NextResponse.json({ error: "Données de locataire invalides; l'affectation de chambre doit se faire via un contrat." }, { status: 400 });
    }
    const created = await prisma.client.create({
      data: {
        nom,
        prenom,
        sexe,
        telephone: typeof body.telephone === "string" ? body.telephone.trim() || null : null,
        profession: typeof body.profession === "string" ? body.profession.trim() || null : null,
        date_entree,
      },
    });
    await logAudit("CREATION_CLIENT", `Locataire créé: #${created.id_client}`);
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur création client: ${message}` }, { status: 500 });
  }
}
