// Liens à usage unique envoyés par e-mail (mot de passe oublié). Même principe que les sessions :
// le lien contient un jeton aléatoire, la base n'en garde que l'empreinte SHA-256.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

const DUREE_MINUTES = 60;
const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

// Crée un jeton et renvoie sa valeur en clair (elle n'existe que dans l'e-mail).
export async function creerJetonMotDePasse(membreId: number) {
  const jeton = randomBytes(32).toString("base64url");
  // Un seul lien valable à la fois : les anciens liens non utilisés de ce membre sont supprimés.
  await prisma.jetonEmail.deleteMany({
    where: { OR: [{ membreId, type: "MOT_DE_PASSE", utiliseLe: null }, { expireLe: { lt: new Date() } }] },
  });
  await prisma.jetonEmail.create({
    data: {
      jetonHash: empreinte(jeton),
      type: "MOT_DE_PASSE",
      membreId,
      expireLe: new Date(Date.now() + DUREE_MINUTES * 60 * 1000),
    },
  });
  return jeton;
}

// Jeton encore valable (ni expiré, ni déjà utilisé, compte toujours accepté), ou null.
export async function jetonValable(jeton: string) {
  if (!jeton) return null;
  const trouve = await prisma.jetonEmail.findUnique({ where: { jetonHash: empreinte(jeton) }, include: { membre: true } });
  if (!trouve || trouve.type !== "MOT_DE_PASSE" || trouve.utiliseLe || trouve.expireLe < new Date()) return null;
  if (trouve.membre.statut !== "ACCEPTE") return null;
  return trouve;
}

// Marque le jeton comme utilisé. Renvoie faux s'il avait déjà servi entre-temps (deux clics rapides).
export async function utiliserJeton(id: number) {
  const { count } = await prisma.jetonEmail.updateMany({ where: { id, utiliseLe: null }, data: { utiliseLe: new Date() } });
  return count === 1;
}
