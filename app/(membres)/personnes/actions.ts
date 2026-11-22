"use server";
// Ajout et modification d'une personne. Tous les membres acceptés peuvent modifier l'arbre :
// exigerMembre() est la vraie protection, et la base garde qui a créé ou modifié chaque fiche.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerMembre } from "@/lib/acces";
import { lireValeurs, texteDe, validerPersonne, type EtatPersonne } from "@/lib/formulaire-personne";
import { identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export async function enregistrerPersonne(_etat: EtatPersonne, d: FormData): Promise<EtatPersonne> {
  const membre = await exigerMembre();
  const valeurs = lireValeurs(d);
  const resultat = validerPersonne(valeurs);
  if ("erreur" in resultat) return { erreur: resultat.erreur, valeurs };
  const { donnees } = resultat;

  let id: number;
  const idTexte = texteDe(d, "id");
  if (idTexte) {
    const idExistant = identifiantValide(idTexte);
    const existe = idExistant !== null && (await prisma.personne.count({ where: { id: idExistant } })) > 0;
    if (!existe) return { erreur: "Cette personne n'existe plus.", valeurs };
    id = idExistant;
    await prisma.personne.update({ where: { id }, data: { ...donnees, modifieParId: membre.id } });
  } else {
    ({ id } = await prisma.personne.create({ data: { ...donnees, creeParId: membre.id }, select: { id: true } }));
  }

  // Les tuiles de l'accueil et la fiche doivent montrer tout de suite les nouvelles informations.
  revalidatePath("/", "layout");
  redirect(`/personnes/${id}`);
}
