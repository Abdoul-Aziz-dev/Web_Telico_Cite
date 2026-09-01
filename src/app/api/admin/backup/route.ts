import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";

export async function GET() {
  try {
    const session = cookies().get("user_session");
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    const user = JSON.parse(session.value);
    if (user.role !== "gerant") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const [clients, chambres, contrats, contratChambres, paiements, depenses, clotures, users, demandesContact] = await Promise.all([
      prisma.client.findMany(),
      prisma.chambre.findMany(),
      prisma.contrat.findMany(),
      prisma.contratChambre.findMany(),
      prisma.paiement.findMany(),
      prisma.depense.findMany(),
      prisma.cloture.findMany(),
      prisma.user.findMany({ select: { id_user: true, nom: true, prenom: true, login: true, role: true } }),
      prisma.demandeContact.findMany(),
    ]);

    const backup = {
      meta: { date: new Date().toISOString(), version: "1.0", source: "Cité Telico" },
      clients, chambres, contrats, contratChambres, paiements, depenses, clotures, users, demandesContact,
    };

    await prisma.auditLog.create({ data: { utilisateur: user.login, id_user: user.id_user, action: "SAUVEGARDE", details: "Sauvegarde complète téléchargée" } });

    const filename = `telico-backup-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
