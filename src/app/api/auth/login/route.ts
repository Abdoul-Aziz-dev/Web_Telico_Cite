import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: "Informations manquantes" }, { status: 400 });
    }

    // Auto-create Aziz if not present
    if (login.toLowerCase() === "aziz") {
      const exists = await prisma.user.findUnique({ where: { login: "Aziz" } });
      if (!exists) {
        await prisma.user.create({
          data: {
            login: "Aziz",
            mot_de_passe: "Aziz224@2026",
            nom: "Aziz",
            prenom: "Abdoul",
            role: "gerant"
          }
        });
      }
    }

    const user = await prisma.user.findUnique({ where: { login } });

    if (!user || user.mot_de_passe !== password) {
      return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect" }, { status: 401 });
    }

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

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur: " + error.message }, { status: 500 });
  }
}
