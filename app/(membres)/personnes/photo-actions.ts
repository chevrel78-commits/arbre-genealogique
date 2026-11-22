"use server";
// Ajouter, remplacer ou retirer la photo d'une personne (tous les membres acceptés).
import { revalidatePath } from "next/cache";
import { exigerMembre } from "@/lib/acces";
import { identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";
import { enregistrerPhoto, PhotoInvalide, supprimerPhoto } from "@/lib/stockage";

export type EtatPhoto = { erreur?: string };

export async function envoyerPhoto(_etat: EtatPhoto, d: FormData): Promise<EtatPhoto> {
  const membre = await exigerMembre();
  const id = identifiantValide(String(d.get("id") ?? ""));
  const fichier = d.get("photo");
  if (id === null) return { erreur: "Cette personne n'existe plus." };
  if (!(fichier instanceof File)) return { erreur: "Choisissez une photo." };
  const avant = await prisma.personne.findUnique({ where: { id }, select: { photo: true } });
  if (!avant) return { erreur: "Cette personne n'existe plus." };

  let nouvelle: string;
  try {
    nouvelle = await enregistrerPhoto(fichier);
  } catch (e) {
    if (e instanceof PhotoInvalide) return { erreur: e.message };
    console.error("Photo non enregistrée :", e);
    return { erreur: "La photo n'a pas pu être enregistrée. Réessayez plus tard." };
  }

  // Si la fiche a disparu entre-temps, on ne laisse pas de fichier orphelin.
  const { count } = await prisma.personne.updateMany({ where: { id }, data: { photo: nouvelle, modifieParId: membre.id } });
  if (count === 0) {
    await supprimerPhoto(nouvelle);
    return { erreur: "Cette personne n'existe plus." };
  }
  await supprimerPhoto(avant.photo);
  revalidatePath("/", "layout");
  return {};
}

export async function retirerPhoto(d: FormData) {
  const membre = await exigerMembre();
  const id = identifiantValide(String(d.get("id") ?? ""));
  if (id === null) return;
  const avant = await prisma.personne.findUnique({ where: { id }, select: { photo: true } });
  if (!avant?.photo) return;
  await prisma.personne.update({ where: { id }, data: { photo: null, modifieParId: membre.id } });
  await supprimerPhoto(avant.photo);
  revalidatePath("/", "layout");
}
