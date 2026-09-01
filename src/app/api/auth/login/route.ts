import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { login, password } = await req.json();
    const ip = headers().get("x-forwarded-for") ?? headers().get("x-real-ip") ?? "inconnue";

    if (!login || !password) {
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

    const sessionData = { id_user: user.id_user, nom: user.nom, prenom: user.prenom, login: user.login, role: user.role };

    cookies().set("user_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Enregistrer la connexion
    await Promise.all([
      prisma.connexionLog.create({ data: { id_user: user.id_user, login: user.login, nom: user.nom, prenom: user.prenom, role: user.role, ip, action: "connexion" } }),
      prisma.auditLog.create({ data: { utilisateur: user.login, id_user: user.id_user, action: "CONNEXION", details: `${user.prenom} ${user.nom} (${user.role}) connecté`, ip } }),
    ]);

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
