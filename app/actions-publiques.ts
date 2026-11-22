"use server";
// Actions des pages publiques (visibles sans être connecté) : demande d'accès, mot de passe oublié,
// choix d'un nouveau mot de passe. Aucune ne révèle si une adresse e-mail a un compte.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, LONGUEUR_MINIMALE } from "@/lib/mot-de-passe";
import { limiteAtteinte, oublierEchecs } from "@/lib/limite-connexion";
import { adresseIp } from "@/lib/ip";
import { creerJetonMotDePasse, jetonValable, utiliserJeton } from "@/lib/jetons";
import { ouvrirSession } from "@/lib/session";
import {
  emailCompteDejaExistant,
  emailDemandeRecue,
  emailMotDePasse,
  emailNouvelleDemande,
} from "@/lib/emails-membres";

const texte = (d: FormData, champ: string) => String(d.get(champ) ?? "").trim();
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vérifie le mot de passe choisi et sa confirmation (message d'erreur, ou null si tout va bien).
function erreurMotDePasse(motDePasse: string, confirmation: string) {
  if (motDePasse.length < LONGUEUR_MINIMALE) return `Le mot de passe doit faire au moins ${LONGUEUR_MINIMALE} caractères.`;
  if (motDePasse.length > 200) return "Le mot de passe est trop long (200 caractères au plus).";
  if (motDePasse !== confirmation) return "Les deux mots de passe ne correspondent pas.";
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Demande d'accès
// ---------------------------------------------------------------------------------------------------

export type EtatDemande = {
  erreur?: string;
  envoyee?: boolean;
  valeurs?: { prenom: string; nom: string; email: string; message: string };
};

export async function demanderAcces(_etat: EtatDemande, d: FormData): Promise<EtatDemande> {
  const valeurs = {
    prenom: texte(d, "prenom").slice(0, 100),
    nom: texte(d, "nom").slice(0, 100),
    email: texte(d, "email").toLowerCase(),
    message: texte(d, "message").slice(0, 1000),
  };
  const motDePasse = String(d.get("motDePasse") ?? "");
  if (!valeurs.prenom || !valeurs.nom) return { erreur: "Indiquez votre prénom et votre nom.", valeurs };
  if (!EMAIL_VALIDE.test(valeurs.email) || valeurs.email.length > 255) return { erreur: "Adresse e-mail invalide.", valeurs };
  const probleme = erreurMotDePasse(motDePasse, String(d.get("confirmation") ?? ""));
  if (probleme) return { erreur: probleme, valeurs };

  // Au plus 5 demandes par heure depuis une même adresse IP (et 3 par adresse e-mail).
  if (await limiteAtteinte("demande", valeurs.email, await adresseIp(), 5, 3))
    return { erreur: "Trop de demandes envoyées. Réessayez dans une heure.", valeurs };

  // Le calcul de l'empreinte est fait dans tous les cas : la réponse prend le même temps, compte existant ou non.
  const motDePasseHash = await hacherMotDePasse(motDePasse);
  const existant = await prisma.membre.findUnique({ where: { email: valeurs.email } });
  const donnees = {
    prenom: valeurs.prenom,
    nom: valeurs.nom,
    motDePasseHash,
    messageDemande: valeurs.message || null,
    statut: "EN_ATTENTE" as const,
  };

  if (!existant) {
    await prisma.membre.create({ data: { email: valeurs.email, ...donnees } });
  } else if (existant.statut === "REFUSE") {
    // Une demande refusée peut être refaite : elle repasse en attente.
    await prisma.membre.update({ where: { id: existant.id }, data: { ...donnees, valideParId: null, valideLe: null } });
  } else {
    // Compte déjà en attente, accepté ou désactivé : on ne change rien. Le titulaire d'un compte actif
    // est prévenu par e-mail ; à l'écran, la réponse est la même que pour une vraie demande.
    if (existant.statut === "ACCEPTE") await emailCompteDejaExistant(existant);
    return { envoyee: true };
  }

  const demandeur = { ...valeurs, messageDemande: donnees.messageDemande };
  await emailDemandeRecue(demandeur);
  await emailNouvelleDemande(demandeur);
  return { envoyee: true };
}

// ---------------------------------------------------------------------------------------------------
// Mot de passe oublié
// ---------------------------------------------------------------------------------------------------

export type EtatOubli = { erreur?: string; envoye?: boolean; email?: string };

export async function demanderNouveauMotDePasse(_etat: EtatOubli, d: FormData): Promise<EtatOubli> {
  const email = texte(d, "email").toLowerCase();
  if (!EMAIL_VALIDE.test(email)) return { erreur: "Adresse e-mail invalide.", email };
  if (await limiteAtteinte("oubli", email, await adresseIp(), 10, 3))
    return { erreur: "Trop de demandes envoyées. Réessayez dans une heure.", email };

  const membre = await prisma.membre.findUnique({ where: { email } });
  // Seul un compte accepté reçoit un lien. Dans tous les cas, la réponse à l'écran est la même.
  if (membre?.statut === "ACCEPTE") await emailMotDePasse(membre, await creerJetonMotDePasse(membre.id));
  return { envoye: true };
}

export type EtatNouveauMotDePasse = { erreur?: string };

export async function changerMotDePasse(_etat: EtatNouveauMotDePasse, d: FormData): Promise<EtatNouveauMotDePasse> {
  const jeton = await jetonValable(String(d.get("jeton") ?? ""));
  if (!jeton) return { erreur: "Ce lien n'est plus valable. Refaites une demande de nouveau mot de passe." };
  const motDePasse = String(d.get("motDePasse") ?? "");
  const probleme = erreurMotDePasse(motDePasse, String(d.get("confirmation") ?? ""));
  if (probleme) return { erreur: probleme };

  if (!(await utiliserJeton(jeton.id))) return { erreur: "Ce lien a déjà servi. Refaites une demande si besoin." };
  await prisma.membre.update({ where: { id: jeton.membreId }, data: { motDePasseHash: await hacherMotDePasse(motDePasse) } });
  // Toutes les connexions ouvertes sont fermées (un intrus éventuel est déconnecté), puis on connecte
  // directement le membre sur cet appareil.
  await prisma.sessionMembre.deleteMany({ where: { membreId: jeton.membreId } });
  await oublierEchecs(jeton.membre.email);
  await ouvrirSession(jeton.membreId);
  redirect("/");
}
