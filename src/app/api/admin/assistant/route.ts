import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API OpenAI non configurée. Ajoutez OPENAI_API_KEY dans votre fichier .env" }, { status: 500 });
    }

    // Contexte dynamique depuis la base
    const [clientsCount, chambresCount, chambresOccupees, paiementsRecents, retardsCount] = await Promise.all([
      prisma.client.count({ where: { statut: "Actif" } }),
      prisma.chambre.count(),
      prisma.chambre.count({ where: { statut: "Occupée" } }),
      prisma.paiement.findMany({ orderBy: { date_paiement: "desc" }, take: 5, include: { client: { select: { nom: true, prenom: true } } } }),
      prisma.client.count({
        where: {
          statut: "Actif",
          paiements: {
            none: {
              date_paiement: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
          },
        },
      }),
    ]);

    const tauxOccupation = chambresCount === 0 ? 0 : Math.round((chambresOccupees / chambresCount) * 100);

    const systemPrompt = `Tu es l'assistant IA de la Cité Telico, une résidence immobilière à Conakry, Guinée. Tu aides le gérant à gérer sa propriété.

Données actuelles de la Cité Telico :
- Locataires actifs : ${clientsCount}
- Chambres totales : ${chambresCount} (${chambresOccupees} occupées, ${chambresCount - chambresOccupees} libres)
- Taux d'occupation : ${tauxOccupation}%
- Locataires en retard de paiement ce mois : ${retardsCount}
- Derniers paiements : ${paiementsRecents.map(p => `${p.client?.prenom} ${p.client?.nom} (${p.mois_paye} - ${p.montant.toLocaleString()} GNF)`).join(", ") || "aucun"}

Tu réponds en français, de manière concise et professionnelle. Tu peux aider avec :
- Analyse des données de la résidence
- Conseils de gestion immobilière
- Rédaction de courriers ou messages pour les locataires
- Calculs financiers (loyers, charges, rentabilité)
- Conseils sur la gestion des retards de paiement
- Questions générales sur la gestion immobilière en Guinée`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Erreur OpenAI" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
