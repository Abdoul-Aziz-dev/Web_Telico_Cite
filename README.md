# Telico Web

Application web de gestion immobilière construite avec Next.js, TypeScript et Prisma.

## Configuration et installation

1. Configurez MySQL et copiez `.env.example` vers `.env`.
2. Renseignez `DATABASE_URL` et `SESSION_SECRET` (au moins 32 caractères aléatoires; obligatoire en production).
3. Exécutez `npm install`, puis `npm run prisma:generate`.
4. Appliquez le schéma à votre base MySQL avec `npx prisma db push` après avoir vérifié votre sauvegarde.
5. Lancez l'application avec `npm run dev`.

Pour créer le premier compte administrateur, renseignez temporairement `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_NOM` et `ADMIN_PRENOM`, puis exécutez `node prisma/seed.js`. Le mot de passe doit contenir au moins 12 caractères. Le seed ne contient pas de compte par défaut.

## Structure

- `src/app` : pages et styles de l'application
- `prisma/schema.prisma` : modèle de données Prisma (MySQL)
- `prisma/client.ts` : instance partagée du client Prisma
- `src/lib/session.ts` : sessions signées et cookies sécurisés

## Notes

- Après `npm install`, Prisma génère automatiquement le client.
- Le projet utilise MySQL; `prisma/telico.db` est un ancien fichier et n'est pas utilisé par le schéma actuel.
- Les exports ouvrent la boîte d'impression du navigateur; choisissez « Enregistrer au format PDF » pour créer un PDF.
- Les SMS ne sont pas envoyés tant qu'un fournisseur réel n'est pas configuré; l'API signale explicitement cette indisponibilité.
- N'exposez jamais `.env` ni les fichiers de sauvegarde. Configurez `SESSION_SECRET` sur le serveur avec une valeur aléatoire propre à chaque environnement.
