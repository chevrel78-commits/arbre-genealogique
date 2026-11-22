// Limite les essais de mot de passe, pour freiner quelqu'un qui essaierait au hasard.
// Chaque échec est noté dans TentativeConnexion ; au-delà du seuil, on refuse pendant 15 minutes.
import { prisma } from "./prisma";

const FENETRE_MINUTES = 15;
const MAX_PAR_EMAIL = 5;
const MAX_PAR_IP = 20;
const ESPACE = "membre";

const debutFenetre = () => new Date(Date.now() - FENETRE_MINUTES * 60 * 1000);

export async function connexionBloquee(email: string, ip: string) {
  const depuis = debutFenetre();
  const [parEmail, parIp] = await Promise.all([
    prisma.tentativeConnexion.count({ where: { espace: ESPACE, email, creeLe: { gte: depuis } } }),
    prisma.tentativeConnexion.count({ where: { espace: ESPACE, ip, creeLe: { gte: depuis } } }),
  ]);
  return parEmail >= MAX_PAR_EMAIL || parIp >= MAX_PAR_IP;
}

export async function noterEchec(email: string, ip: string) {
  await prisma.tentativeConnexion.create({ data: { espace: ESPACE, email: email.slice(0, 255), ip: ip.slice(0, 64) } });
  // Ménage des vieux échecs (plus d'un jour).
  await prisma.tentativeConnexion.deleteMany({ where: { creeLe: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
}

// Après une connexion réussie, on oublie les échecs de cette adresse.
export async function oublierEchecs(email: string) {
  await prisma.tentativeConnexion.deleteMany({ where: { espace: ESPACE, email } });
}

// Limite des formulaires publics (demande d'accès, mot de passe oublié), pour freiner les robots :
// chaque envoi est noté dans la même table, sous un autre « espace ».
// Renvoie vrai si la limite est atteinte ; sinon note l'envoi et renvoie faux.
export async function limiteAtteinte(espace: "demande" | "oubli", email: string, ip: string, maxParIp: number, maxParEmail: number) {
  const depuis = new Date(Date.now() - 60 * 60 * 1000); // fenêtre d'une heure
  const [parIp, parEmail] = await Promise.all([
    prisma.tentativeConnexion.count({ where: { espace, ip, creeLe: { gte: depuis } } }),
    prisma.tentativeConnexion.count({ where: { espace, email, creeLe: { gte: depuis } } }),
  ]);
  if (parIp >= maxParIp || parEmail >= maxParEmail) return true;
  await prisma.tentativeConnexion.create({ data: { espace, email: email.slice(0, 255), ip: ip.slice(0, 64) } });
  return false;
}
