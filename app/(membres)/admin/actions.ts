"use server";
// Actions de la page Administration. Chacune commence par exigerAdministrateur() : c'est la vraie
// protection (un bouton caché à l'écran ne suffit pas, une action peut être appelée directement).
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdministrateur, type MembreConnecte } from "@/lib/acces";
import { COOKIE_INFO } from "./messages";
import { emailAccesAccepte, emailAccesRefuse } from "@/lib/emails-membres";

type Cible = { id: number; admin: boolean; superAdmin: boolean };

// Règles : personne ne touche au super-administrateur ni à son propre compte ;
// seul le super-administrateur gère les autres administrateurs.
function peutGerer(acteur: MembreConnecte, cible: Cible) {
  if (cible.superAdmin || cible.id === acteur.id) return false;
  if (cible.admin && !acteur.superAdmin) return false;
  return true;
}

async function cibleDuFormulaire(d: FormData) {
  const id = Number(d.get("id"));
  if (!Number.isInteger(id)) return null;
  return prisma.membre.findUnique({ where: { id } });
}

// Message à afficher une fois sur la page (un code connu de la page, gardé 10 secondes dans un cookie),
// puis nouvel affichage de la page ET du bandeau (nombre de demandes en attente).
async function retour(info: string) {
  (await cookies()).set(COOKIE_INFO, info, { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 10 });
  revalidatePath("/", "layout");
}

export async function accepterDemande(d: FormData) {
  const acteur = await exigerAdministrateur();
  const cible = await cibleDuFormulaire(d);
  if (!cible || (cible.statut !== "EN_ATTENTE" && cible.statut !== "REFUSE") || !peutGerer(acteur, cible)) return retour("impossible");
  await prisma.membre.update({
    where: { id: cible.id },
    data: { statut: "ACCEPTE", valideParId: acteur.id, valideLe: new Date() },
  });
  await retour((await emailAccesAccepte(cible)) ? "accepte" : "accepte-sans-email");
}

export async function refuserDemande(d: FormData) {
  const acteur = await exigerAdministrateur();
  const cible = await cibleDuFormulaire(d);
  if (!cible || cible.statut !== "EN_ATTENTE" || !peutGerer(acteur, cible)) return retour("impossible");
  await prisma.membre.update({
    where: { id: cible.id },
    data: { statut: "REFUSE", valideParId: acteur.id, valideLe: new Date() },
  });
  await retour((await emailAccesRefuse(cible)) ? "refuse" : "refuse-sans-email");
}

export async function desactiverMembre(d: FormData) {
  const acteur = await exigerAdministrateur();
  const cible = await cibleDuFormulaire(d);
  if (!cible || cible.statut !== "ACCEPTE" || !peutGerer(acteur, cible)) return retour("impossible");
  await prisma.membre.update({ where: { id: cible.id }, data: { statut: "DESACTIVE" } });
  // Ses connexions ouvertes sont fermées tout de suite.
  await prisma.sessionMembre.deleteMany({ where: { membreId: cible.id } });
  await retour("desactive");
}

export async function reactiverMembre(d: FormData) {
  const acteur = await exigerAdministrateur();
  const cible = await cibleDuFormulaire(d);
  if (!cible || cible.statut !== "DESACTIVE" || !peutGerer(acteur, cible)) return retour("impossible");
  await prisma.membre.update({ where: { id: cible.id }, data: { statut: "ACCEPTE" } });
  await retour("reactive");
}

// Nommer ou retirer un administrateur : réservé au super-administrateur.
export async function basculerAdministrateur(d: FormData) {
  const acteur = await exigerAdministrateur();
  if (!acteur.superAdmin) return retour("impossible");
  const cible = await cibleDuFormulaire(d);
  if (!cible || cible.statut !== "ACCEPTE" || !peutGerer(acteur, cible)) return retour("impossible");
  await prisma.membre.update({ where: { id: cible.id }, data: { admin: !cible.admin } });
  await retour(cible.admin ? "admin-retire" : "admin-nomme");
}
