import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../prisma/client";
import { verifySessionToken } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

export async function GET() {
  try {
    const user = await verifySessionToken(cookies().get("user_session")?.value);
    const chambres = await prisma.chambre.findMany({
      where: user?.role === "gerant" ? undefined : { statut: "Libre" },
      orderBy: { id_chambre: "asc" },
    });
    return NextResponse.json({ chambres });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture chambres' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const numero = typeof body.numero === "string" ? body.numero.trim() : "";
    const type_chambre = typeof body.type_chambre === "string" ? body.type_chambre.trim() : "";
    const prix = Number(body.prix);
    if (!numero || !type_chambre || !Number.isFinite(prix) || prix <= 0) {
      return NextResponse.json({ error: "Numéro, type et prix positif sont obligatoires" }, { status: 400 });
    }
    if (body.statut && body.statut !== "Libre") {
      return NextResponse.json({ error: "Une nouvelle chambre doit être créée libre" }, { status: 400 });
    }
    const created = await prisma.chambre.create({
      data: { numero, type_chambre, prix, photo: typeof body.photo === "string" ? body.photo : null },
    });
    await logAudit("CREATION_CHAMBRE", `Chambre ${created.numero} créée`);
    return NextResponse.json({ chambre: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur création chambre: ${message}` }, { status: 500 });
  }
}
