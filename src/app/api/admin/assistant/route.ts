import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

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
    const lastUserMessage = messages?.[messages.length - 1]?.content || "";

    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyValid = apiKey && !apiKey.includes("YOUR_OPENAI_API_KEY");

    if (isKeyValid) {
      try {
        const systemPrompt = `Tu es l'assistant IA de la Cité Telico, une résidence immobilière à Conakry, Guinée. Tu aides le gérant à gérer sa propriété.

Données actuelles de la Cité Telico :
- Locataires actifs : ${clientsCount}
- Chambres totales : ${chambresCount} (${chambresOccupees} occupées, ${chambresCount - chambresOccupees} libres)
- Taux d'occupation : ${tauxOccupation}%
- Locataires en retard de paiement ce mois : ${retardsCount}
- Derniers paiements : ${paiementsRecents.map(p => `${p.client?.prenom} ${p.client?.nom} (${p.mois_paye} - ${p.montant.toLocaleString()} GNF)`).join(", ") || "aucun"}

Tu réponds en français, de manière concise et professionnelle.`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply });
        }
      } catch (err) {
        console.warn("OpenAI API call failed, falling back to local assistant:", err);
      }
    }

    // Réponse intelligente locale basée sur la base de données Cité Telico
    let reply = `🤖 **Assistant Cité Telico (Mode Analyse Interne)**\n\n`;

    const lowerQuery = lastUserMessage.toLowerCase();
    if (lowerQuery.includes("stat") || lowerQuery.includes("résumé") || lowerQuery.includes("rapport") || lowerQuery.includes("occup")) {
      reply += `📊 **État Général de la Résidence :**\n` +
        `- Locataires actifs : **${clientsCount}**\n` +
        `- Chambres occupées : **${chambresOccupees} / ${chambresCount}** (${tauxOccupation}% de remplissage)\n` +
        `- Chambres libres : **${chambresCount - chambresOccupees}**\n` +
        `- Loyalistes / En retard ce mois : **${retardsCount} locataires**\n`;
    } else if (lowerQuery.includes("retard") || lowerQuery.includes("loyer")) {
      reply += `⚠️ **Point sur les Retards de Loyer :**\n` +
        `Il y a actuellement **${retardsCount} locataire(s)** n'ayant pas encore réglé le loyer du mois en cours.\n` +
        `💡 *Conseil : Vous pouvez consulter le module **Loyers en retard** pour envoyer une relance SMS ou télécharger un relevé.*`;
    } else if (lowerQuery.includes("paiement") || lowerQuery.includes("recette")) {
      reply += `💳 **Dernières Transactions Enregistrées :**\n` +
        (paiementsRecents.length > 0
          ? paiementsRecents.map(p => `• ${p.client?.prenom} ${p.client?.nom} - ${p.mois_paye} : **${p.montant.toLocaleString()} GNF**`).join("\n")
          : "Aucun paiement récent enregistré.") + "\n";
    } else {
      reply += `Voici la situation actuelle de la Cité Telico :\n` +
        `• **${clientsCount}** locataires actifs\n` +
        `• Taux d'occupation de **${tauxOccupation}%** (${chambresOccupees}/${chambresCount} chambres)\n` +
        `• **${retardsCount}** retard(s) de loyer détecté(s)\n\n` +
        `Comment puis-je vous aider pour la gestion aujourd'hui ? (Vous pouvez me poser des questions sur les logements, les paiements ou les retards).`;
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
