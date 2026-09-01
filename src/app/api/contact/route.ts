import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const { nom, email, message, typeChambre } = await req.json();

    if (!nom || !email || !message) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const demande = await prisma.demandeContact.create({
      data: { nom, email, message, type_chambre: typeChambre || "Standard" },
    });

    return NextResponse.json({ success: true, demande }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const demandes = await prisma.demandeContact.findMany({
      orderBy: { date_demande: "desc" },
    });
    return NextResponse.json({ demandes });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
