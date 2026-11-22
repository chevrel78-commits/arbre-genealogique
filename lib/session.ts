// Sessions de connexion : un jeton aléatoire dans un cookie httpOnly (illisible par le JavaScript de la
// page), et seulement son empreinte SHA-256 en base (table SessionMembre).
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "./prisma";

export const NOM_COOKIE = "arbre_session";
const DUREE_JOURS = 30;

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function ouvrirSession(membreId: number) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_JOURS * 24 * 3600 * 1000);
  await prisma.sessionMembre.create({ data: { jetonHash: empreinte(jeton), membreId, expireLe } });
  // Ménage : les sessions expirées ne servent plus à rien.
  await prisma.sessionMembre.deleteMany({ where: { expireLe: { lt: new Date() } } });
  (await cookies()).set(NOM_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expireLe,
  });
}

// Membre de la session en cours (ou null si pas de cookie, session inconnue ou expirée).
export async function membreDeLaSession() {
  // Lecture faite à chaque visite (jamais au moment de la construction du site).
  await connection();
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  if (!jeton) return null;
  const session = await prisma.sessionMembre.findUnique({
    where: { jetonHash: empreinte(jeton) },
    include: { membre: true },
  });
  if (!session || session.expireLe < new Date()) return null;
  return session.membre;
}

export async function fermerSession() {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (jeton) await prisma.sessionMembre.deleteMany({ where: { jetonHash: empreinte(jeton) } });
  magasin.delete(NOM_COOKIE);
}
