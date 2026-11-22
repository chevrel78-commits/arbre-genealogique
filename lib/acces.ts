// La vraie protection du site. Chaque page et chaque action qui lit ou modifie l'arbre appelle
// exigerMembre() ; les actions d'administration appellent exigerAdministrateur().
// (proxy.ts ne regarde que la présence du cookie : un cookie peut être inventé, la base non.)
import { redirect } from "next/navigation";
import { membreDeLaSession } from "./session";

export type MembreConnecte = {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  admin: boolean;
  superAdmin: boolean;
};

export async function exigerMembre(): Promise<MembreConnecte> {
  const membre = await membreDeLaSession();
  // Session absente ou expirée, ou compte qui n'est plus « accepté » (refusé, désactivé…).
  if (!membre || membre.statut !== "ACCEPTE") redirect("/connexion");
  const { id, prenom, nom, email, admin, superAdmin } = membre;
  return { id, prenom, nom, email, admin: admin || superAdmin, superAdmin };
}

export async function exigerAdministrateur(): Promise<MembreConnecte> {
  const membre = await exigerMembre();
  if (!membre.admin) redirect("/");
  return membre;
}
