# Telico Web

Application web de gestion immobilière construite avec Next.js, TypeScript et Prisma.

## Installation

1. Ouvrez un terminal dans `telico-web`
2. Exécutez `npm install`
3. Lancez le serveur de développement avec `npm run dev`

## Structure

- `src/app` : pages et styles de l'application
- `prisma/schema.prisma` : modèle de données Prisma
- `prisma/client.ts` : instance partagée du client Prisma

## Notes

- Après `npm install`, Prisma génère automatiquement le client.
- La base SQLite est configurée dans `prisma/schema.prisma` vers `file:./telico.db`.
- Ajoutez des pages et routes API pour gérer les utilisateurs, clients et facturation.
