import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import bcrypt from "bcryptjs";

function getSession() {
  try { return JSON.parse(cookies().get("user_session")?.value ?? "null"); } catch { return null; }
}

// Lister tous les utilisateurs
export async function GET() {
  try {
    const users = await prisma.user.findMany({ select: { id_user: true, nom: true, prenom: true, login: true, role: true } });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Erreur lecture utilisateurs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session || session.role !== "gerant") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const ip = headers().get("x-forwarded-for") ?? "inconnue";

  try {
    const body = await req.json();
    const { action } = body;

    // Créer un utilisateur
    if (action === "create_user") {
      const { nom, prenom, login, password, role } = body;
      if (!nom || !prenom || !login || !password) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
      const exists = await prisma.user.findUnique({ where: { login } });
      if (exists) return NextResponse.json({ error: "Ce login existe déjà" }, { status: 400 });
      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { nom, prenom, login, mot_de_passe: hashed, role: role || "visiteur" } });
      await prisma.auditLog.create({ data: { utilisateur: session.login, id_user: session.id_user, action: "CREATION_USER", details: `Utilisateur créé: ${login} (${role})`, ip } });
      return NextResponse.json({ success: true, user: { id_user: user.id_user, nom: user.nom, prenom: user.prenom, login: user.login, role: user.role } });
    }

    // Changer mot de passe
    if (action === "change_password") {
      const { id_user, new_password } = body;
      if (!id_user || !new_password || new_password.length < 6) return NextResponse.json({ error: "Mot de passe invalide (min 6 caractères)" }, { status: 400 });
      const hashed = await bcrypt.hash(new_password, 12);
      await prisma.user.update({ where: { id_user }, data: { mot_de_passe: hashed } });
      await prisma.auditLog.create({ data: { utilisateur: session.login, id_user: session.id_user, action: "CHANGEMENT_MDP", details: `Mot de passe changé pour user id: ${id_user}`, ip } });
      return NextResponse.json({ success: true });
    }

    // Supprimer utilisateur
    if (action === "delete_user") {
      const { id_user } = body;
      if (id_user === session.id_user) return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });
      await prisma.user.delete({ where: { id_user } });
      await prisma.auditLog.create({ data: { utilisateur: session.login, id_user: session.id_user, action: "SUPPRESSION_USER", details: `User id ${id_user} supprimé`, ip } });
      return NextResponse.json({ success: true });
    }

    // Vider les données opérationnelles (garder users + chambres)
    if (action === "clear_data") {
      const { confirm } = body;
      if (confirm !== "VIDER") return NextResponse.json({ error: "Confirmation incorrecte" }, { status: 400 });
      await prisma.$transaction([
        prisma.paiement.deleteMany(),
        prisma.contratChambre.deleteMany(),
        prisma.contrat.deleteMany(),
        prisma.client.deleteMany(),
        prisma.depense.deleteMany(),
        prisma.cloture.deleteMany(),
        prisma.demandeContact.deleteMany(),
      ]);
      await prisma.auditLog.create({ data: { utilisateur: session.login, id_user: session.id_user, action: "VIDAGE_DONNEES", details: "Toutes les données opérationnelles ont été vidées", ip } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur serveur: " + msg }, { status: 500 });
  }
}
