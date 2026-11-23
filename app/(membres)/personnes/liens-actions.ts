"use server";
// Actions des liens de famille. Chaque action vérifie d'abord le compte (exigerMembre ou
// exigerAdministrateur), puis enregistre tout d'un bloc (avecVerrou) : en cas d'erreur, rien ne change.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigerAdministrateur, exigerMembre } from "@/lib/acces";
import { lireValeurs, texteDe, validerPersonne, type EtatPersonne } from "@/lib/formulaire-personne";
import { avecVerrou, ErreurLien, relier, retirerConjoint, retirerFrere, retirerParent, type OptionsLien } from "@/lib/liens";
import { COOKIE_INFO_FICHE } from "@/lib/messages-fiche";
import { estTypeLien, identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";
import { supprimerPhoto } from "@/lib/stockage";

// Statut d'un couple : marié, en couple ou divorcé. Les enfants gardent leurs deux parents.
export async function changerStatutCouple(d: FormData) {
  await exigerMembre();
  const sourceId = identifiantValide(texteDe(d, "source"));
  const familleId = identifiantValide(texteDe(d, "famille"));
  const statut = texteDe(d, "statut");
  if (sourceId === null || familleId === null || !["marie", "couple", "divorce"].includes(statut)) return;
  await prisma.famille.updateMany({
    where: { id: familleId, parent1Id: { not: null }, parent2Id: { not: null }, OR: [{ parent1Id: sourceId }, { parent2Id: sourceId }] },
    data: { marie: statut !== "couple", divorce: statut === "divorce" },
  });
  revalidatePath("/", "layout");
}

function lireContexte(d: FormData) {
  const sourceId = identifiantValide(texteDe(d, "source"));
  const lien = texteDe(d, "lien");
  return sourceId !== null && estTypeLien(lien) ? { sourceId, lien } : null;
}

const lireOptions = (d: FormData): OptionsLien => ({
  union: texteDe(d, "union") || undefined,
  marie: d.get("marie") === "on",
  enfantsCommuns: d.get("enfantsCommuns") === "on",
});

// Créer une nouvelle personne et la relier.
export async function ajouterNouveauProche(_etat: EtatPersonne, d: FormData): Promise<EtatPersonne> {
  const membre = await exigerMembre();
  const contexte = lireContexte(d);
  const options = lireOptions(d);
  const valeurs = lireValeurs(d);
  const retour = { valeurs, union: options.union, marie: options.marie, enfantsCommuns: options.enfantsCommuns };
  if (!contexte) return { ...retour, erreur: "Ce lien est invalide." };
  const resultat = validerPersonne(valeurs);
  if ("erreur" in resultat) return { ...retour, erreur: resultat.erreur };

  try {
    await avecVerrou(async (tx) => {
      const { id } = await tx.personne.create({ data: { ...resultat.donnees, creeParId: membre.id }, select: { id: true } });
      await relier(tx, contexte.lien, contexte.sourceId, id, options);
    });
  } catch (e) {
    if (e instanceof ErreurLien) return { ...retour, erreur: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/personnes/${contexte.sourceId}`);
}

// Relier une personne déjà présente dans l'arbre.
export async function relierProche(_etat: EtatPersonne, d: FormData): Promise<EtatPersonne> {
  await exigerMembre();
  const contexte = lireContexte(d);
  const options = lireOptions(d);
  const retour = { union: options.union, marie: options.marie, enfantsCommuns: options.enfantsCommuns };
  const cibleId = identifiantValide(texteDe(d, "cibleId"));
  if (!contexte || cibleId === null) return { ...retour, erreur: "Ce lien est invalide." };

  try {
    await avecVerrou((tx) => relier(tx, contexte.lien, contexte.sourceId, cibleId, options));
  } catch (e) {
    if (e instanceof ErreurLien) return { ...retour, erreur: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/personnes/${contexte.sourceId}`);
}

// Retirer un lien : les deux personnes restent dans l'arbre.
export async function retirerLien(d: FormData) {
  await exigerMembre();
  const sourceId = identifiantValide(texteDe(d, "source"));
  const cibleId = identifiantValide(texteDe(d, "cible"));
  const type = texteDe(d, "type");
  if (sourceId === null || cibleId === null) return;

  let info = "ok:Le lien a été retiré.";
  try {
    await avecVerrou(async (tx) => {
      if (type === "parent") await retirerParent(tx, sourceId, cibleId);
      else if (type === "enfant") await retirerParent(tx, cibleId, sourceId);
      else if (type === "conjoint") await retirerConjoint(tx, sourceId, cibleId);
      else if (type === "frere") await retirerFrere(tx, sourceId, cibleId);
      else throw new ErreurLien("Ce lien est invalide.");
    });
  } catch (e) {
    if (!(e instanceof ErreurLien)) throw e;
    info = `erreur:${e.message}`;
  }
  (await cookies()).set(COOKIE_INFO_FICHE, info, { httpOnly: true, sameSite: "lax", path: "/personnes", maxAge: 10 });
  revalidatePath("/", "layout");
}

// Supprimer une personne : irréversible, donc réservé aux administrateurs.
export async function supprimerPersonne(d: FormData) {
  await exigerAdministrateur();
  const id = identifiantValide(texteDe(d, "id"));
  if (id === null) return;
  const fichiers = await avecVerrou(async (tx) => {
    const personne = await tx.personne.findUnique({
      where: { id },
      select: { photo: true, identifications: { select: { photoId: true } } },
    });
    await tx.personne.deleteMany({ where: { id } });
    // Une photo de galerie où plus personne n'est identifiée n'apparaîtrait plus nulle part : on l'efface.
    const orphelines = await tx.photo.findMany({
      where: { id: { in: personne?.identifications.map((i) => i.photoId) ?? [] }, identifications: { none: {} } },
      select: { id: true, fichier: true },
    });
    await tx.photo.deleteMany({ where: { id: { in: orphelines.map((o) => o.id) } } });
    return [personne?.photo, ...orphelines.map((o) => o.fichier)];
  });
  // Les fichiers ne sont effacés qu'une fois la suppression enregistrée.
  await Promise.all(fichiers.map((f) => supprimerPhoto(f)));
  revalidatePath("/", "layout");
  redirect("/");
}
