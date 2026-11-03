import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { logAudit } from "../../../../lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const client = await prisma.client.findUnique({
      where: { id_client: id },
      include: {
        chambre: true,
        contrats: {
          include: {
            contrat_chambres: {
              include: { chambre: true }
            }
          },
          orderBy: { id_contrat: "desc" }
        },
        paiements: {
          orderBy: { id_paiement: "desc" }
        }
      }
    });
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture client' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    const body = await req.json();
    if (body.id_chambre !== undefined) {
      return NextResponse.json({ error: "L'affectation de chambre doit se faire via un contrat" }, { status: 400 });
    }
    const data: {
      nom?: string;
      prenom?: string;
      sexe?: string;
      telephone?: string | null;
      profession?: string | null;
      date_entree?: Date;
      statut?: string;
    } = {};
    for (const field of ["nom", "prenom"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || !body[field].trim()) return NextResponse.json({ error: `${field} invalide` }, { status: 400 });
        data[field] = body[field].trim();
      }
    }
    if (body.sexe !== undefined) {
      if (!["M", "F"].includes(body.sexe)) return NextResponse.json({ error: "Sexe invalide" }, { status: 400 });
      data.sexe = body.sexe;
    }
    if (body.telephone !== undefined) data.telephone = typeof body.telephone === "string" ? body.telephone.trim() || null : null;
    if (body.profession !== undefined) data.profession = typeof body.profession === "string" ? body.profession.trim() || null : null;
    if (body.date_entree !== undefined) {
      const date = new Date(body.date_entree);
      if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Date d'entrée invalide" }, { status: 400 });
      data.date_entree = date;
    }
    if (body.statut !== undefined) {
      if (!["Actif", "Inactif"].includes(body.statut)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      data.statut = body.statut;
    }

    const updated = body.statut === "Inactif"
      ? await prisma.$transaction(async (tx) => {
          const client = await tx.client.findUnique({ where: { id_client: id } });
          if (!client) throw new Error("Locataire introuvable");
          const activeContracts = await tx.contrat.findMany({
            where: {
              id_client: id,
              OR: [{ date_fin: null }, { date_fin: { gte: new Date() } }],
            },
            include: { contrat_chambres: true },
          });
          const date_fin = new Date();
          for (const contract of activeContracts) {
            await tx.contrat.update({ where: { id_contrat: contract.id_contrat }, data: { date_fin } });
            for (const relation of contract.contrat_chambres) {
              const anotherContract = await tx.contratChambre.findFirst({
                where: {
                  id_chambre: relation.id_chambre,
                  id_contrat: { not: contract.id_contrat },
                  contrat: { OR: [{ date_fin: null }, { date_fin: { gte: date_fin } }] },
                },
              });
              if (!anotherContract) await tx.chambre.update({ where: { id_chambre: relation.id_chambre }, data: { statut: "Libre" } });
            }
          }
          return tx.client.update({
            where: { id_client: id },
            data: { ...data, statut: "Inactif", id_chambre: null },
          });
        })
      : await prisma.client.update({ where: { id_client: id }, data });
    await logAudit(body.statut === "Inactif" ? "DESACTIVATION_CLIENT" : "MODIFICATION_CLIENT", `Locataire #${id} modifié`);
    return NextResponse.json({ client: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur mise à jour client: ${message}` }, { status: message.includes("introuvable") ? 404 : 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    await prisma.client.delete({ where: { id_client: id } });
    await logAudit("SUPPRESSION_CLIENT", `Locataire #${id} supprimé`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Suppression impossible; vérifiez les contrats et paiements liés. ${message}` }, { status: 409 });
  }
}
