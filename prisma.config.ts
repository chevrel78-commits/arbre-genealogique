import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` (lancé à l'installation, y compris sur Hostinger) n'ouvre aucune connexion :
    // une adresse factice lui suffit quand DATABASE_URL n'est pas définie. Les commandes
    // qui touchent à la base (migrate, seed, studio) échouent alors clairement à la connexion.
    url: process.env.DATABASE_URL || "mysql://non-configuree@localhost:3306/non-configuree",
    // Facultative : seulement nécessaire pour `prisma migrate dev`.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
