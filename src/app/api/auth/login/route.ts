import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie } from "../../../../lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const ip = headers().get("x-forwarded-for") ?? headers().get("x-real-ip") ?? "inconnue";

    if (!login || !password || login.length > 80 || password.length > 1024) {
      return NextResponse.json({ error: "Informations manquantes" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      await prisma.auditLog.create({ data: { utilisateur: login, action: "ECHEC_CONNEXION", details: `Tentative avec login inconnu: ${login}`, ip } });
      return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect" }, { status: 401 });
    }

    const isHashed = user.mot_de_passe.startsWith("$2");
    const valid = isHashed ? await bcrypt.compare(password, user.mot_de_passe) : user.mot_de_passe === password;

    if (!valid) {
      await prisma.auditLog.create({ data: { utilisateur: login, id_user: user.id_user, action: "ECHEC_CONNEXION", details: "Mot de passe incorrect", ip } });
      return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect" }, { status: 401 });
    }

    if (!isHashed) {
      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { id_user: user.id_user }, data: { mot_de_passe: hashed } });
    }

    if (user.role !== "gerant" && user.role !== "visiteur") {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }
    const sessionData = {
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      login: user.login,
      role: user.role === "gerant" ? "gerant" as const : "visiteur" as const,
    };
    const response = NextResponse.json({ success: true, user: sessionData });
    setSessionCookie(response, await createSessionToken(sessionData));

    // Enregistrer la connexion
    await Promise.all([
      prisma.connexionLog.create({ data: { id_user: user.id_user, login: user.login, nom: user.nom, prenom: user.prenom, role: user.role, ip, action: "connexion" } }),
      prisma.auditLog.create({ data: { utilisateur: user.login, id_user: user.id_user, action: "CONNEXION", details: `${user.prenom} ${user.nom} (${user.role}) connecté`, ip } }),
    ]);

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
