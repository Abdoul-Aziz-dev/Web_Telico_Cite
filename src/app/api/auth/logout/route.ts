import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import { verifySessionToken } from "../../../../lib/session";

export async function POST() {
  try {
    const cookieStore = cookies();
    const user = await verifySessionToken(cookieStore.get("user_session")?.value);
    const ip = headers().get("x-forwarded-for") ?? "inconnue";

    if (user) {
      await Promise.all([
        prisma.connexionLog.create({ data: { id_user: user.id_user, login: user.login, nom: user.nom, prenom: user.prenom, role: user.role, ip, action: "deconnexion" } }),
        prisma.auditLog.create({ data: { utilisateur: user.login, id_user: user.id_user, action: "DECONNEXION", details: `${user.prenom} ${user.nom} déconnecté`, ip } }),
      ]);
    }

    cookieStore.delete("user_session");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur de déconnexion: ${message}` }, { status: 500 });
  }
}
