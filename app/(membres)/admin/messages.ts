// Messages affichés en haut de la page Administration après une action (le code passe par un cookie).
export const COOKIE_INFO = "arbre_admin_info";

export const MESSAGES: Record<string, { texte: string; erreur?: boolean }> = {
  accepte: { texte: "Demande acceptée : la personne est prévenue par e-mail." },
  "accepte-sans-email": { texte: "Demande acceptée, mais l'e-mail n'a pas pu partir : prévenez la personne vous-même.", erreur: true },
  refuse: { texte: "Demande refusée : la personne est prévenue par e-mail." },
  "refuse-sans-email": { texte: "Demande refusée, mais l'e-mail n'a pas pu partir.", erreur: true },
  desactive: { texte: "Compte désactivé : la personne ne peut plus se connecter." },
  reactive: { texte: "Compte réactivé." },
  "admin-nomme": { texte: "Ce membre est maintenant administrateur." },
  "admin-retire": { texte: "Ce membre n'est plus administrateur." },
  impossible: { texte: "Action impossible (déjà faite, ou réservée au super-administrateur).", erreur: true },
};
