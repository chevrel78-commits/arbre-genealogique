// Règles communes aux personnes de l'arbre. Ce fichier ne touche pas à la base : il peut donc servir
// aussi bien sur le serveur que dans les formulaires du navigateur.

export const CIVILITES = { M: "M.", MME: "Mme", MLLE: "Mlle" } as const;
export type CodeCivilite = keyof typeof CIVILITES;

export const ANNEE_MINIMALE = 1000;

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

// Vérifie une date de naissance partielle : renvoie le message d'erreur, ou null si elle est correcte.
export function erreurDateNaissance({ jour, mois, annee }: DatePartielle, aujourdhui: { jour: number; mois: number; annee: number }) {
  if (jour !== null && mois === null) return "Indiquez le mois si vous connaissez le jour.";
  if (mois !== null && annee === null) return "Indiquez l'année si vous connaissez le mois.";
  if (annee === null) return null;
  if (annee < ANNEE_MINIMALE || annee > aujourdhui.annee)
    return `L'année de naissance doit être comprise entre ${ANNEE_MINIMALE} et ${aujourdhui.annee}.`;
  if (mois === null) return null;
  if (mois < 1 || mois > 12) return "Le mois de naissance est invalide.";
  if (annee === aujourdhui.annee && mois > aujourdhui.mois) return "La date de naissance ne peut pas être dans le futur.";
  if (jour === null) return null;
  if (jour < 1 || jour > joursDuMois(mois, annee)) return `Cette date n'existe pas : ${MOIS[mois - 1]} ${annee} n'a pas de jour ${jour}.`;
  if (annee === aujourdhui.annee && mois === aujourdhui.mois && jour > aujourdhui.jour)
    return "La date de naissance ne peut pas être dans le futur.";
  return null;
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
  let date = "";
  if (annee !== null) {
    if (mois === null) date = `en ${annee}`;
    else if (jour === null) date = `en ${MOIS[mois - 1]} ${annee}`;
    else date = `le ${jour === 1 ? "1er" : jour} ${MOIS[mois - 1]} ${annee}`;
  }
  return [p.civilite === "M" ? "Né" : "Née", date, lieu ? `à ${lieu}` : ""].filter(Boolean).join(" ");
}

// Transforme un identifiant reçu dans une adresse ou un formulaire en nombre sûr (ou null s'il est invalide).
export function identifiantValide(texte: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(texte)) return null;
  const id = Number(texte);
  return id <= 2147483647 ? id : null; // plus grand entier accepté par la colonne INT de MySQL
}
