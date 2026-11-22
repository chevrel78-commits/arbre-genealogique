# Arbre généalogique

Site SaaS de création d'arbres généalogiques : la famille y construit ensemble son arbre, sur un site privé dont l’accès est validé par des administrateurs.

Stack : Next.js 16, Prisma 7, MariaDB, hébergement Hostinger. Les consignes du projet sont dans [`CLAUDE.md`](CLAUDE.md).

## Démarrer en local

1. Copier `.env.example` en `.env` et renseigner les adresses des bases de développement et shadow.
2. `npm install`
3. `npx prisma migrate dev`
4. `npm run dev`, puis ouvrir http://localhost:3000
