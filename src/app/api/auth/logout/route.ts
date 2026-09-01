import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";

export async function POST() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get("user_session");
    const ip = headers().get("x-forwarded-for") ?? "inconnue";

    if (session) {
      try {
        const user = JSON.parse(session.value);
        await Promise.all([
          prisma.connexionLog.create({ data: { id_user: user.id_user, login: user.login, nom: user.nom, prenom: user.prenom, role: user.role, ip, action: "deconnexion" } }),
          prisma.auditLog.create({ data: { utilisateur: user.login, id_user: user.id_user, action: "DECONNEXION", details: `${user.prenom} ${user.nom} déconnecté`, ip } }),
        ]);
      } catch { /* session invalide, on ignore */ }
    }

    cookieStore.delete("user_session");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
