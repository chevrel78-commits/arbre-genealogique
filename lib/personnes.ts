// Règles communes aux personnes de l'arbre. Ce fichier ne touche pas à la base : il peut donc servir
// aussi bien sur le serveur que dans les formulaires du navigateur.

export const CIVILITES = { M: "M.", MME: "Mme", MLLE: "Mlle" } as const;
export type CodeCivilite = keyof typeof CIVILITES;

export const ANNEE_MINIMALE = 1000;
export const TAILLE_PHOTO_MAX = 10 * 1024 * 1024; // 10 Mo

export function estCivilite(valeur: string): valeur is CodeCivilite {
  return Object.hasOwn(CIVILITES, valeur);
}

// « né » ou « née », selon la civilité.
export const accordNe = (civilite: CodeCivilite) => (civilite === "M" ? "né" : "née");

export const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

// Année bissextile. Avant le calendrier grégorien (adopté en France fin 1582), c'était une année sur quatre.
function estBissextile(annee: number) {
  if (annee < 1583) return annee % 4 === 0;
  return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

function joursDuMois(mois: number, annee: number) {
  if (mois === 2) return estBissextile(annee) ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

export type DatePartielle = { jour: number | null; mois: number | null; annee: number | null };

type Aujourdhui = { jour: number; mois: number; annee: number };

// Vérifie une date partielle : renvoie le message d'erreur, ou null si elle est correcte.
function erreurDate({ jour, mois, annee }: DatePartielle, aujourdhui: Aujourdhui, quoi: "naissance" | "décès" | "prise de vue") {
  if (jour !== null && mois === null) return `Date de ${quoi} : indiquez le mois si vous connaissez le jour.`;
  if (mois !== null && annee === null) return `Date de ${quoi} : indiquez l'année si vous connaissez le mois.`;
  if (annee === null) return null;
  if (annee < ANNEE_MINIMALE || annee > aujourdhui.annee)
    return `L'année de ${quoi} doit être comprise entre ${ANNEE_MINIMALE} et ${aujourdhui.annee}.`;
  if (mois === null) return null;
  if (mois < 1 || mois > 12) return `Le mois de ${quoi} est invalide.`;
  if (annee === aujourdhui.annee && mois > aujourdhui.mois) return `La date de ${quoi} ne peut pas être dans le futur.`;
  if (jour === null) return null;
  if (jour < 1 || jour > joursDuMois(mois, annee)) return `Cette date n'existe pas : ${MOIS[mois - 1]} ${annee} n'a pas de jour ${jour}.`;
  if (annee === aujourdhui.annee && mois === aujourdhui.mois && jour > aujourdhui.jour)
    return `La date de ${quoi} ne peut pas être dans le futur.`;
  return null;
}

export const erreurDateNaissance = (date: DatePartielle, aujourdhui: Aujourdhui) => erreurDate(date, aujourdhui, "naissance");
export const erreurDatePrise = (date: DatePartielle, aujourdhui: Aujourdhui) => erreurDate(date, aujourdhui, "prise de vue");

// Le décès ne peut pas précéder la naissance. Avec des dates partielles, on compare seulement ce qui est connu.
export function erreurDateDeces(deces: DatePartielle, naissance: DatePartielle, aujourdhui: Aujourdhui) {
  const erreur = erreurDate(deces, aujourdhui, "décès");
  if (erreur) return erreur;
  const avant = "Le décès ne peut pas être antérieur à la naissance.";
  if (deces.annee === null || naissance.annee === null) return null;
  if (deces.annee !== naissance.annee) return deces.annee < naissance.annee ? avant : null;
  if (deces.mois === null || naissance.mois === null) return null;
  if (deces.mois !== naissance.mois) return deces.mois < naissance.mois ? avant : null;
  if (deces.jour === null || naissance.jour === null) return null;
  return deces.jour < naissance.jour ? avant : null;
}

// « le 1er mars 1950 », « en mars 1950 », « en 1950 », ou rien si l'année est inconnue.
function dateEnTexte({ jour, mois, annee }: DatePartielle) {
  if (annee === null) return "";
  if (mois === null) return `en ${annee}`;
  if (jour === null) return `en ${MOIS[mois - 1]} ${annee}`;
  return `le ${jour === 1 ? "1er" : jour} ${MOIS[mois - 1]} ${annee}`;
}

// Phrase de la fiche : « Née le 12 mars 1950 à Lyon », « Né en 1920 », « Née à Lyon »…
export function phraseNaissance(p: {
  civilite: CodeCivilite;
  jourNaissance: number | null;
  moisNaissance: number | null;
  anneeNaissance: number | null;
  lieuNaissance: string | null;
}) {
  const { jourNaissance: jour, moisNaissance: mois, anneeNaissance: annee, lieuNaissance: lieu } = p;
  if (annee === null && !lieu) return "Date de naissance inconnue";
  const date = dateEnTexte({ jour, mois, annee });
  return [p.civilite === "M" ? "Né" : "Née", date, lieu ? `à ${lieu}` : ""].filter(Boolean).join(" ");
}

// « Décédée le 3 mai 2010 », « Décédé » si la date est inconnue, ou null pour une personne en vie.
export function phraseDeces(p: {
  civilite: CodeCivilite;
  decede: boolean;
  jourDeces: number | null;
  moisDeces: number | null;
  anneeDeces: number | null;
}) {
  if (!p.decede) return null;
  const date = dateEnTexte({ jour: p.jourDeces, mois: p.moisDeces, annee: p.anneeDeces });
  return [p.civilite === "M" ? "Décédé" : "Décédée", date].filter(Boolean).join(" ");
}

// Sous une photo : « Prise le 3 mai 1962 à Lyon », « Prise en 1962 », « Prise à Lyon », ou null.
export function phrasePrise(p: { jourPrise: number | null; moisPrise: number | null; anneePrise: number | null; lieu: string | null }) {
  const date = dateEnTexte({ jour: p.jourPrise, mois: p.moisPrise, annee: p.anneePrise });
  if (!date && !p.lieu) return null;
  return ["Prise", date, p.lieu ? `à ${p.lieu}` : ""].filter(Boolean).join(" ");
}

// Sur les tuiles : « 1950 », « 1950 – 2010 », « 1950 † » (décès sans date), « † 2010 » ou « † ».
export function anneesDeVie(p: { anneeNaissance: number | null; decede: boolean; anneeDeces: number | null }) {
  if (!p.decede) return p.anneeNaissance === null ? null : String(p.anneeNaissance);
  if (p.anneeNaissance !== null && p.anneeDeces !== null) return `${p.anneeNaissance} – ${p.anneeDeces}`;
  if (p.anneeNaissance !== null) return `${p.anneeNaissance} †`;
  return p.anneeDeces !== null ? `† ${p.anneeDeces}` : "†";
}

// Les six liens que l'on peut ajouter depuis une fiche.
export const LIENS = {
  pere: { libelle: "Père", titre: "un père" },
  mere: { libelle: "Mère", titre: "une mère" },
  frere: { libelle: "Frère", titre: "un frère" },
  soeur: { libelle: "Sœur", titre: "une sœur" },
  enfant: { libelle: "Enfant", titre: "un enfant" },
  conjoint: { libelle: "Conjoint", titre: "un conjoint" },
} as const;
export type TypeLien = keyof typeof LIENS;

export function estTypeLien(valeur: string): valeur is TypeLien {
  return Object.hasOwn(LIENS, valeur);
}

// Transforme un identifiant reçu dans une adresse ou un formulaire en nombre sûr (ou null s'il est invalide).
export function identifiantValide(texte: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(texte)) return null;
  const id = Number(texte);
  return id <= 2147483647 ? id : null; // plus grand entier accepté par la colonne INT de MySQL
}
