import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  const [clients, chambres, contrats, paiements, depenses, clotures, chambresOccupees, revenue] = await Promise.all([
    prisma.client.count(),
    prisma.chambre.count(),
    prisma.contrat.count(),
    prisma.paiement.count(),
    prisma.depense.aggregate({ _sum: { montant: true } }),
    prisma.cloture.count(),
    prisma.chambre.count({ where: { statut: "Occupée" } }),
    prisma.paiement.aggregate({ _sum: { montant: true } }),
  ]);

  const montantTotal = revenue._sum.montant ?? 0;
  const totalDepenses = depenses._sum.montant ?? 0;
  const tauxOccupation = chambres === 0 ? 0 : Number(((chambresOccupees / chambres) * 100).toFixed(0));

  return NextResponse.json({
    clients,
    chambres,
    contrats,
    paiements,
    totalRevenue: montantTotal,
    totalDepenses,
    clotures,
    chambresOccupees,
    chambresLibres: chambres - chambresOccupees,
    tauxOccupation,
  });
}
