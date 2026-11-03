import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie } from "../../../../lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!nom || !prenom || !login || nom.length > 100 || prenom.length > 100 || login.length > 80) {
      return NextResponse.json({ error: "Nom, prénom et identifiant valides sont obligatoires" }, { status: 400 });
    }
    if (password.length < 12) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 12 caractères" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { login } });
    if (exists) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { nom, prenom, login, mot_de_passe: hashed, role: "visiteur" },
    });

    const sessionData = {
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      login: user.login,
      role: "visiteur" as const,
    };

    const response = NextResponse.json({ success: true, user: sessionData }, { status: 201 });
    setSessionCookie(response, await createSessionToken(sessionData));
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
