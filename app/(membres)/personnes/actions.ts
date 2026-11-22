"use server";
// Ajout et modification d'une personne. Tous les membres acceptés peuvent modifier l'arbre :
// exigerMembre() est la vraie protection, et la base garde qui a créé ou modifié chaque fiche.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerMembre } from "@/lib/acces";
import { erreurDateNaissance, estCivilite, identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export type ValeursPersonne = {
  civilite: string;
  prenom: string;
  nom: string;
  nomJeuneFille: string;
  jourNaissance: string;
  moisNaissance: string;
  anneeNaissance: string;
  lieuNaissance: string;
};
export type EtatPersonne = { erreur?: string; valeurs?: ValeursPersonne };

const texte = (d: FormData, champ: string) => String(d.get(champ) ?? "").trim();

// Champ de date : vide = null ; NaN si ce ne sont pas uniquement des chiffres.
const nombre = (valeur: string) => (valeur === "" ? null : /^\d{1,4}$/.test(valeur) ? Number(valeur) : NaN);

// La date du jour en France, quel que soit le fuseau horaire du serveur.
function aujourdhuiEnFrance() {
  const parties = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const partie = (type: string) => Number(parties.find((p) => p.type === type)?.value);
  return { jour: partie("day"), mois: partie("month"), annee: partie("year") };
}

export async function enregistrerPersonne(_etat: EtatPersonne, d: FormData): Promise<EtatPersonne> {
  const membre = await exigerMembre();

  const valeurs: ValeursPersonne = {
    civilite: texte(d, "civilite"),
    prenom: texte(d, "prenom").slice(0, 100),
    nom: texte(d, "nom").slice(0, 100),
    nomJeuneFille: texte(d, "nomJeuneFille").slice(0, 100),
    jourNaissance: texte(d, "jourNaissance"),
    moisNaissance: texte(d, "moisNaissance"),
    anneeNaissance: texte(d, "anneeNaissance"),
    lieuNaissance: texte(d, "lieuNaissance").slice(0, 150),
  };
  const { civilite } = valeurs;
  if (!estCivilite(civilite)) return { erreur: "Choisissez une civilité.", valeurs };
  if (!valeurs.prenom || !valeurs.nom) return { erreur: "Indiquez le prénom et le nom.", valeurs };

  const jour = nombre(valeurs.jourNaissance);
  const mois = nombre(valeurs.moisNaissance);
  const annee = nombre(valeurs.anneeNaissance);
  if (Number.isNaN(jour) || Number.isNaN(mois) || Number.isNaN(annee))
    return { erreur: "La date de naissance ne doit contenir que des chiffres.", valeurs };
  const erreurDate = erreurDateNaissance({ jour, mois, annee }, aujourdhuiEnFrance());
  if (erreurDate) return { erreur: erreurDate, valeurs };

  const donnees = {
    civilite,
    prenom: valeurs.prenom,
    nom: valeurs.nom,
    nomJeuneFille: valeurs.nomJeuneFille || null,
    jourNaissance: jour,
    moisNaissance: mois,
    anneeNaissance: annee,
    lieuNaissance: valeurs.lieuNaissance || null,
  };

  let id: number;
  const idTexte = texte(d, "id");
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
