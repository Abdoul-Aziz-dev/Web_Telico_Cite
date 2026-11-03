import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";
import { logAudit } from "../../../lib/audit";

export async function POST(req: Request) {
  try {
    const { nom, email, message, typeChambre } = await req.json();

    if (
      typeof nom !== "string" || !nom.trim() || nom.length > 150 ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof message !== "string" || !message.trim() || message.length > 10000
    ) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const demande = await prisma.demandeContact.create({
      data: {
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        type_chambre: typeof typeChambre === "string" && typeChambre.trim() ? typeChambre.trim().slice(0, 100) : "Standard",
      },
    });
    await logAudit("DEMANDE_CONTACT", `Nouvelle demande de contact #${demande.id_demande}`);

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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id_demande);
    if (!Number.isInteger(id) || id <= 0 || typeof body.traitee !== "boolean") {
      return NextResponse.json({ error: "Demande ou statut invalide" }, { status: 400 });
    }
    const demande = await prisma.demandeContact.update({
      where: { id_demande: id },
      data: { traitee: body.traitee },
    });
    await logAudit(body.traitee ? "CONTACT_TRAITE" : "CONTACT_REOUVERT", `Demande de contact #${id} mise à jour`);
    return NextResponse.json({ demande });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur mise à jour de la demande: ${message}` }, { status: 500 });
  }
}
