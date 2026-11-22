// Lecture et contrôle du formulaire d'une personne (ajout, modification, ajout d'un proche).
import { erreurDateNaissance, estCivilite, type CodeCivilite } from "./personnes";

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

// Réponse du serveur à un formulaire. Les choix de lien sont renvoyés pour rester cochés après une erreur.
export type EtatPersonne = {
  erreur?: string;
  valeurs?: ValeursPersonne;
  union?: string;
  marie?: boolean;
  enfantsCommuns?: boolean;
};

export type DonneesPersonne = {
  civilite: CodeCivilite;
  prenom: string;
  nom: string;
  nomJeuneFille: string | null;
  jourNaissance: number | null;
  moisNaissance: number | null;
  anneeNaissance: number | null;
  lieuNaissance: string | null;
};

export const texteDe = (d: FormData, champ: string) => String(d.get(champ) ?? "").trim();

// Champ de date : vide = null ; NaN si ce ne sont pas uniquement des chiffres.
const nombre = (valeur: string) => (valeur === "" ? null : /^\d{1,4}$/.test(valeur) ? Number(valeur) : NaN);

// La date du jour en France, quel que soit le fuseau horaire du serveur.
function aujourdhuiEnFrance() {
  const parties = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const partie = (type: string) => Number(parties.find((p) => p.type === type)?.value);
  return { jour: partie("day"), mois: partie("month"), annee: partie("year") };
}

export function lireValeurs(d: FormData): ValeursPersonne {
  return {
    civilite: texteDe(d, "civilite"),
    prenom: texteDe(d, "prenom").slice(0, 100),
    nom: texteDe(d, "nom").slice(0, 100),
    nomJeuneFille: texteDe(d, "nomJeuneFille").slice(0, 100),
    jourNaissance: texteDe(d, "jourNaissance"),
    moisNaissance: texteDe(d, "moisNaissance"),
    anneeNaissance: texteDe(d, "anneeNaissance"),
    lieuNaissance: texteDe(d, "lieuNaissance").slice(0, 150),
  };
}

export function validerPersonne(v: ValeursPersonne): { erreur: string } | { donnees: DonneesPersonne } {
  const { civilite } = v;
  if (!estCivilite(civilite)) return { erreur: "Choisissez une civilité." };
  if (!v.prenom || !v.nom) return { erreur: "Indiquez le prénom et le nom." };

  const jour = nombre(v.jourNaissance);
  const mois = nombre(v.moisNaissance);
  const annee = nombre(v.anneeNaissance);
  if (Number.isNaN(jour) || Number.isNaN(mois) || Number.isNaN(annee))
    return { erreur: "La date de naissance ne doit contenir que des chiffres." };
  const erreurDate = erreurDateNaissance({ jour, mois, annee }, aujourdhuiEnFrance());
  if (erreurDate) return { erreur: erreurDate };

  return {
    donnees: {
      civilite,
      prenom: v.prenom,
      nom: v.nom,
      nomJeuneFille: v.nomJeuneFille || null,
      jourNaissance: jour,
      moisNaissance: mois,
      anneeNaissance: annee,
      lieuNaissance: v.lieuNaissance || null,
    },
  };
}
