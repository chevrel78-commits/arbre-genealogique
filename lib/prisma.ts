import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

// Convertit DATABASE_URL (mysql://utilisateur:motdepasse@hote:port/base) pour le pilote MariaDB.
function configDepuisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    connectionLimit: 5,
    // Hostinger limite chaque utilisateur MySQL à 500 connexions par heure et coupe toute connexion
    // inactive au bout de 20 secondes (wait_timeout). Par défaut, le pilote garde 5 connexions
    // inactives en permanence et les rouvre à chaque coupure (~900 par heure, sans aucune activité).
    // On n'en garde donc aucune en réserve, et l'application ferme elle-même une connexion
    // inutilisée au bout de 15 secondes, avant que le serveur ne la coupe.
    minimumIdle: 0,
    idleTimeout: 15,
  };
}

function creerClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  // Sans DATABASE_URL (par exemple pendant la construction sur l'hébergeur), le module doit rester
  // importable : l'erreur n'apparaît qu'à la première utilisation de la base.
  if (!url)
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL manquante (fichier .env en local, variables d'environnement en ligne).");
      },
    });
  return new PrismaClient({ adapter: new PrismaMariaDb(configDepuisUrl(url)) });
}

// En développement, on réutilise le même client entre deux rechargements à chaud.
const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalPourPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") globalPourPrisma.prisma = prisma;
