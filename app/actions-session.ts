"use server";
// Actions de connexion et de déconnexion (exécutées sur le serveur, appelées par les formulaires).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { empreinteLeurre, verifierMotDePasse } from "@/lib/mot-de-passe";
import { connexionBloquee, noterEchec, oublierEchecs } from "@/lib/limite-connexion";
import { fermerSession, ouvrirSession } from "@/lib/session";

export type EtatConnexion = { erreur?: string; email?: string };

async function adresseIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
}

export async function seConnecter(_etat: EtatConnexion, donnees: FormData): Promise<EtatConnexion> {
  const email = String(donnees.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  if (!email || !motDePasse) return { erreur: "Saisissez votre e-mail et votre mot de passe.", email };

  const ip = await adresseIp();
  if (await connexionBloquee(email, ip))
    return { erreur: "Trop d'essais. Patientez 15 minutes avant de réessayer.", email };

  const membre = await prisma.membre.findUnique({ where: { email } });
  // Même calcul si l'e-mail est inconnu : la réponse ne trahit pas l'existence d'un compte.
  const bon = await verifierMotDePasse(motDePasse, membre?.motDePasseHash ?? (await empreinteLeurre()));
  if (!membre || !bon) {
    await noterEchec(email, ip);
    return { erreur: "E-mail ou mot de passe incorrect.", email };
  }
  // Le mot de passe est bon : on peut dire pourquoi le compte n'entre pas.
  if (membre.statut === "EN_ATTENTE")
    return { erreur: "Votre demande d'accès est en attente de validation par un administrateur.", email };
  if (membre.statut !== "ACCEPTE") return { erreur: "Ce compte n'a pas accès au site.", email };

  await oublierEchecs(email);
  await ouvrirSession(membre.id);
  redirect("/");
}

export async function seDeconnecter() {
  await fermerSession();
  redirect("/connexion");
}
