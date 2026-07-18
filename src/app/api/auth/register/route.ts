import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const { nom, prenom, login, password } = await req.json();

    if (!nom || !prenom || !login || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { login } });
    if (exists) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déja pris" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        login,
        mot_de_passe: password,
        role: "visiteur"
      }
    });

    const sessionData = {
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      login: user.login,
      role: user.role
    };

    cookies().set("user_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/"
    });

    return NextResponse.json({ success: true, user: sessionData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur: " + error.message }, { status: 500 });
  }
}
