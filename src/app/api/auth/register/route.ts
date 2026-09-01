import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nom, prenom, login, password } = await req.json();

    if (!nom || !prenom || !login || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
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
      role: user.role,
    };

    cookies().set("user_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true, user: sessionData }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
