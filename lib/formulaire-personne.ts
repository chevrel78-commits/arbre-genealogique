// Lecture et contrôle du formulaire d'une personne (ajout, modification, ajout d'un proche).
import { erreurDateDeces, erreurDateNaissance, estCivilite, type CodeCivilite } from "./personnes";

export const LONGUEUR_INFORMATION = 2000;

export type ValeursPersonne = {
  civilite: string;
  prenom: string;
  nom: string;
  nomJeuneFille: string;
  jourNaissance: string;
  moisNaissance: string;
  anneeNaissance: string;
  lieuNaissance: string;
  decede: string; // « on » si la case est cochée
  jourDeces: string;
  moisDeces: string;
  anneeDeces: string;
  information: string;
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
  decede: boolean;
  jourDeces: number | null;
  moisDeces: number | null;
  anneeDeces: number | null;
  information: string | null;
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
    decede: d.get("decede") === "on" ? "on" : "",
    jourDeces: texteDe(d, "jourDeces"),
    moisDeces: texteDe(d, "moisDeces"),
    anneeDeces: texteDe(d, "anneeDeces"),
    information: texteDe(d, "information").replace(/\r\n/g, "\n").slice(0, LONGUEUR_INFORMATION),
  };
}

export function validerPersonne(v: ValeursPersonne): { erreur: string } | { donnees: DonneesPersonne } {
  const { civilite } = v;
  if (!estCivilite(civilite)) return { erreur: "Choisissez une civilité." };
  if (!v.prenom || !v.nom) return { erreur: "Indiquez le prénom et le nom." };

  const naissance = { jour: nombre(v.jourNaissance), mois: nombre(v.moisNaissance), annee: nombre(v.anneeNaissance) };
  const deces = { jour: nombre(v.jourDeces), mois: nombre(v.moisDeces), annee: nombre(v.anneeDeces) };
  if ([naissance.jour, naissance.mois, naissance.annee, deces.jour, deces.mois, deces.annee].some((x) => Number.isNaN(x)))
    return { erreur: "Les dates ne doivent contenir que des chiffres." };

  const aujourdhui = aujourdhuiEnFrance();
  const erreurNaissance = erreurDateNaissance(naissance, aujourdhui);
  if (erreurNaissance) return { erreur: erreurNaissance };
  const erreurDeces = erreurDateDeces(deces, naissance, aujourdhui);
  if (erreurDeces) return { erreur: erreurDeces };

  return {
    donnees: {
      civilite,
      prenom: v.prenom,
      nom: v.nom,
      nomJeuneFille: v.nomJeuneFille || null,
      jourNaissance: naissance.jour,
      moisNaissance: naissance.mois,
      anneeNaissance: naissance.annee,
      lieuNaissance: v.lieuNaissance || null,
      // Une date de décès suffit à indiquer que la personne est décédée.
      decede: v.decede === "on" || deces.annee !== null,
      jourDeces: deces.jour,
      moisDeces: deces.mois,
      anneeDeces: deces.annee,
      information: v.information || null,
    },
  };
}
