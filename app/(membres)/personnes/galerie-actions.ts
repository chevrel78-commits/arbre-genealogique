"use server";
// Galerie : ajouter une photo, décrire sa date et son lieu, identifier les personnes, retirer.
// Tout membre accepté peut identifier ; seuls l'auteur de l'ajout et les administrateurs suppriment une photo.
import { revalidatePath } from "next/cache";
import { exigerMembre } from "@/lib/acces";
import { erreurDatePrise, identifiantValide, type DatePartielle } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";
import { enregistrerDocumentGalerie, enregistrerPhotoGalerie, PhotoInvalide, supprimerPhoto } from "@/lib/stockage";

export type EtatGalerie = { erreur?: string };
export type PersonneIdentifiable = { id: number; nom: string; precision: string | null };

const LONGUEUR_LIEU = 150;
const LONGUEUR_LEGENDE = 255;

const idValide = (n: unknown) => identifiantValide(String(n ?? ""));

function aujourdhui() {
  const [annee, mois, jour] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()).split("-").map(Number);
  return { jour, mois, annee };
}

function entier(d: FormData, champ: string) {
  const texte = String(d.get(champ) ?? "").trim();
  if (texte === "") return null;
  return /^\d{1,4}$/.test(texte) ? Number(texte) : NaN;
}

// Lit la date, le lieu et la légende du formulaire.
function lireInfos(d: FormData) {
  const date: DatePartielle = { jour: entier(d, "jour"), mois: entier(d, "mois"), annee: entier(d, "annee") };
  if ([date.jour, date.mois, date.annee].some((v) => Number.isNaN(v))) return { erreur: "La date de prise de vue est invalide." };
  const erreur = erreurDatePrise(date, aujourdhui());
  if (erreur) return { erreur };
  const lieu = String(d.get("lieu") ?? "").trim();
  const legende = String(d.get("legende") ?? "").trim();
  if (lieu.length > LONGUEUR_LIEU) return { erreur: `Le lieu est trop long (${LONGUEUR_LIEU} caractères au plus).` };
  if (legende.length > LONGUEUR_LEGENDE) return { erreur: `La légende est trop longue (${LONGUEUR_LEGENDE} caractères au plus).` };
  return {
    donnees: { jourPrise: date.jour, moisPrise: date.mois, anneePrise: date.annee, lieu: lieu || null, legende: legende || null },
  };
}

export async function ajouterPhotoGalerie(d: FormData): Promise<EtatGalerie & { photoId?: number }> {
  const membre = await exigerMembre();
  const personneId = idValide(d.get("id"));
  const fichier = d.get("photo");
  if (personneId === null) return { erreur: "Cette personne n'existe plus." };
  if (!(fichier instanceof File)) return { erreur: "Choisissez une photo ou un document." };
  const infos = lireInfos(d);
  if (!infos.donnees) return { erreur: infos.erreur };
  if (!(await prisma.personne.findUnique({ where: { id: personneId }, select: { id: true } }))) return { erreur: "Cette personne n'existe plus." };

  // Un PDF arrive avec l'image de sa première page (« apercu »), dessinée dans le navigateur.
  const document = d.get("format") === "PDF";
  const apercu = d.get("apercu");
  let image: Awaited<ReturnType<typeof enregistrerPhotoGalerie>>;
  try {
    image = document ? await enregistrerDocumentGalerie(fichier, apercu instanceof File ? apercu : null) : await enregistrerPhotoGalerie(fichier);
  } catch (e) {
    if (e instanceof PhotoInvalide) return { erreur: e.message };
    console.error("Photo de galerie non enregistrée :", e);
    return { erreur: "La photo n'a pas pu être enregistrée. Réessayez plus tard." };
  }

  try {
    // La personne de la fiche est identifiée d'office : la photo entre aussitôt dans sa galerie.
    const photo = await prisma.photo.create({
      data: {
        ...infos.donnees,
        fichier: image.identifiant,
        format: document ? "PDF" : "IMAGE",
        largeur: image.largeur,
        hauteur: image.hauteur,
        ajouteeParId: membre.id,
        identifications: { create: { personneId, ajouteeParId: membre.id } },
      },
      select: { id: true },
    });
    revalidatePath("/", "layout");
    return { photoId: photo.id };
  } catch (e) {
    // Pas de fichier orphelin si la fiche a disparu entre-temps.
    await supprimerPhoto(image.identifiant);
    console.error("Photo de galerie non notée en base :", e);
    return { erreur: "La photo n'a pas pu être enregistrée. Réessayez plus tard." };
  }
}

export async function modifierInfosPhoto(d: FormData): Promise<EtatGalerie> {
  await exigerMembre();
  const photoId = idValide(d.get("photoId"));
  if (photoId === null) return { erreur: "Cette photo n'existe plus." };
  const infos = lireInfos(d);
  if (!infos.donnees) return { erreur: infos.erreur };
  const { count } = await prisma.photo.updateMany({ where: { id: photoId }, data: infos.donnees });
  if (count === 0) return { erreur: "Cette photo n'existe plus." };
  revalidatePath("/", "layout");
  return {};
}

// Liste chargée à l'ouverture d'une photo ; le tri par nom se fait ici, la recherche dans le navigateur.
export async function listerPersonnesIdentifiables(): Promise<PersonneIdentifiable[]> {
  await exigerMembre();
  const personnes = await prisma.personne.findMany({
    select: { id: true, prenom: true, nom: true, nomJeuneFille: true, anneeNaissance: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  return personnes.map((p) => ({
    id: p.id,
    nom: `${p.prenom} ${p.nom}`,
    precision: [p.nomJeuneFille ? `née ${p.nomJeuneFille}` : "", p.anneeNaissance ?? ""].filter(Boolean).join(", ") || null,
  }));
}

// Ajoute une identification, ou déplace son repère si la personne est déjà sur la photo.
export async function identifierPersonne(photoIdBrut: number, personneIdBrut: number, x: number | null, y: number | null): Promise<EtatGalerie> {
  const membre = await exigerMembre();
  const photoId = idValide(photoIdBrut);
  const personneId = idValide(personneIdBrut);
  if (photoId === null || personneId === null) return { erreur: "Identification impossible." };
  const dansImage = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
  const repere = dansImage(x) && dansImage(y) ? { x, y } : {};
  try {
    await prisma.identificationPhoto.upsert({
      where: { photoId_personneId: { photoId, personneId } },
      create: { photoId, personneId, ajouteeParId: membre.id, ...repere },
      update: repere,
    });
  } catch (e) {
    console.error("Identification impossible :", e);
    return { erreur: "Cette photo ou cette personne n'existe plus." };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function retirerIdentification(photoIdBrut: number, personneIdBrut: number): Promise<EtatGalerie> {
  await exigerMembre();
  const photoId = idValide(photoIdBrut);
  const personneId = idValide(personneIdBrut);
  if (photoId === null || personneId === null) return { erreur: "Retrait impossible." };
  // Une photo sans personne identifiée n'apparaîtrait plus dans aucune galerie.
  const erreur = await prisma.$transaction(async (tx) => {
    const autres = await tx.identificationPhoto.count({ where: { photoId, personneId: { not: personneId } } });
    if (autres === 0) return "C'est la dernière personne identifiée sur cette photo : supprimez plutôt la photo.";
    await tx.identificationPhoto.deleteMany({ where: { photoId, personneId } });
    return null;
  });
  if (erreur) return { erreur };
  revalidatePath("/", "layout");
  return {};
}

export async function supprimerPhotoGalerie(photoIdBrut: number): Promise<EtatGalerie> {
  const membre = await exigerMembre();
  const photoId = idValide(photoIdBrut);
  if (photoId === null) return { erreur: "Cette photo n'existe plus." };
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { fichier: true, ajouteeParId: true } });
  if (!photo) return { erreur: "Cette photo n'existe plus." };
  if (!membre.admin && photo.ajouteeParId !== membre.id) return { erreur: "Seul le membre qui a ajouté cette photo ou un administrateur peut la supprimer." };
  await prisma.photo.delete({ where: { id: photoId } });
  await supprimerPhoto(photo.fichier); // le fichier n'est effacé qu'une fois la suppression enregistrée
  revalidatePath("/", "layout");
  return {};
}

// Nom de la commune d'après le GPS (OpenStreetMap). Seules des coordonnées arrondies à environ 1 km quittent
// le site, sans photo ni nom de personne, et la position n'est jamais conservée. En cas d'échec : pas de lieu.
export async function lieuDepuisGps(latitude: number, longitude: number): Promise<string | null> {
  await exigerMembre();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const parametres = new URLSearchParams({
    format: "jsonv2",
    lat: latitude.toFixed(2),
    lon: longitude.toFixed(2),
    zoom: "12",
    addressdetails: "1",
    "accept-language": "fr",
  });
  try {
    const reponse = await fetch(`https://nominatim.openstreetmap.org/reverse?${parametres}`, {
      headers: { "User-Agent": "arbre-genealogique/1.0" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!reponse.ok) return null;
    const { address: a } = (await reponse.json()) as { address?: Record<string, string> };
    if (!a) return null;
    const commune = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? a.county ?? a.state;
    if (!commune) return a.country ?? null;
    const lieu = a.country_code === "fr" || !a.country ? commune : `${commune}, ${a.country}`;
    return lieu.slice(0, LONGUEUR_LIEU);
  } catch (e) {
    console.error("Lieu de la photo non trouvé :", e instanceof Error ? e.name : e);
    return null;
  }
}
