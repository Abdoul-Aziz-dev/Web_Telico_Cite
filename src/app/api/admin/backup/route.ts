import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import { verifySessionToken } from "../../../../lib/session";

export async function GET() {
  try {
    const user = await verifySessionToken(cookies().get("user_session")?.value);
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    if (user.role !== "gerant") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    await prisma.auditLog.create({
      data: {
        utilisateur: user.login,
        id_user: user.id_user,
        action: "SAUVEGARDE",
        details: "Sauvegarde complète de la base téléchargée",
      },
    });

    const [
      users, clients, chambres, contrats, contratChambres, paiements, paiementsArchives,
      depenses, depensesArchives, clotures, auditLogs, connexionLogs, demandesContact,
      relances, appConfigs, smsLogs,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.chambre.findMany(),
      prisma.contrat.findMany(),
      prisma.contratChambre.findMany(),
      prisma.paiement.findMany(),
      prisma.paiementArchive.findMany(),
      prisma.depense.findMany(),
      prisma.depenseArchive.findMany(),
      prisma.cloture.findMany(),
      prisma.auditLog.findMany(),
      prisma.connexionLog.findMany(),
      prisma.demandeContact.findMany(),
      prisma.relanceLoyer.findMany(),
      prisma.appConfig.findMany(),
      prisma.smsLog.findMany(),
    ]);

    const backup = {
      meta: { date: new Date().toISOString(), version: "2.0", source: "Cité Telico" },
      users, clients, chambres, contrats, contratChambres, paiements, paiementsArchives,
      depenses, depensesArchives, clotures, auditLogs, connexionLogs, demandesContact,
      relances, appConfigs, smsLogs,
    };

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
