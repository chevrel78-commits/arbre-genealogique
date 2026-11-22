// Stockage des photos des personnes : un dossier sur le serveur, hors du site (STOCKAGE_MEDIAS),
// pour qu'elles survivent aux publications. Seul module qui touche à ces fichiers.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TAILLE_PHOTO_MAX } from "./personnes";

const COTE_GRANDE = 1200;
const COTE_VIGNETTE = 240;
const FORMATS_ACCEPTES = ["jpeg", "png", "webp"];

// Noms générés ici : un identifiant aléatoire, jamais le nom d'origine ni celui de la personne.
const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NOM_FICHIER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-v)?\.webp$/;

const dossier = () => path.resolve(process.env.STOCKAGE_MEDIAS ?? "stockage/medias", "personnes");

// Erreur « normale » : son message est affiché tel quel à l'utilisateur.
export class PhotoInvalide extends Error {}

// Zone carrée choisie dans la fenêtre de recadrage, en fractions de l'image : x et y depuis le coin haut
// gauche, cote par rapport à la largeur.
export type Recadrage = { x: number; y: number; cote: number };

function zoneCarree({ x, y, cote }: Recadrage, largeur: number, hauteur: number) {
  const taille = Math.max(1, Math.min(Math.round(cote * largeur), largeur, hauteur));
  return {
    left: Math.max(0, Math.min(Math.round(x * largeur), largeur - taille)),
    top: Math.max(0, Math.min(Math.round(y * hauteur), hauteur - taille)),
    width: taille,
    height: taille,
  };
}

// Vérifie l'image, puis crée une grande version et une vignette carrée. rotate() applique le sens de
// l'appareil ; sharp ne recopie aucune métadonnée (lieu GPS, appareil, date) dans les images produites.
export async function enregistrerPhoto(fichier: File, recadrage?: Recadrage): Promise<string> {
  if (fichier.size === 0) throw new PhotoInvalide("Choisissez une photo.");
  if (fichier.size > TAILLE_PHOTO_MAX) throw new PhotoInvalide("Cette photo est trop lourde (10 Mo au plus).");
  const entree = Buffer.from(await fichier.arrayBuffer());

  let grande: Buffer;
  let vignette: Buffer;
  try {
    const { format, width, height, orientation } = await sharp(entree).metadata();
    if (!format || !FORMATS_ACCEPTES.includes(format)) throw new PhotoInvalide("Format non accepté : envoyez une image JPEG, PNG ou WebP.");
    // Le recadrage est exprimé sur l'image remise à l'endroit : les orientations 5 à 8 échangent largeur et hauteur.
    const tournee = (orientation ?? 1) >= 5;
    const zone = recadrage ? zoneCarree(recadrage, tournee ? height : width, tournee ? width : height) : null;
    const image = () => (zone ? sharp(entree).rotate().extract(zone) : sharp(entree).rotate());
    [grande, vignette] = await Promise.all([
      image().resize({ width: COTE_GRANDE, height: COTE_GRANDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(),
      image().resize({ width: COTE_VIGNETTE, height: COTE_VIGNETTE, fit: "cover", position: zone ? "centre" : sharp.strategy.attention }).webp({ quality: 80 }).toBuffer(),
    ]);
  } catch (e) {
    if (e instanceof PhotoInvalide) throw e;
    // La vraie cause reste visible dans le journal du serveur (image abîmée, mémoire insuffisante…).
    console.error("Photo non traitée :", e);
    throw new PhotoInvalide("Cette image n'a pas pu être traitée. Essayez avec une autre photo.");
  }

  const identifiant = randomUUID();
  await mkdir(dossier(), { recursive: true });
  try {
    await writeFile(path.join(dossier(), `${identifiant}.webp`), grande);
    await writeFile(path.join(dossier(), `${identifiant}-v.webp`), vignette);
  } catch (e) {
    await supprimerPhoto(identifiant);
    throw e;
  }
  return identifiant;
}

export async function lirePhoto(nom: string): Promise<Buffer | null> {
  if (!NOM_FICHIER.test(nom)) return null;
  const chemin = path.join(dossier(), nom);
  try {
    return await readFile(chemin);
  } catch (e) {
    // Visible dans les journaux du serveur : fichier absent (ENOENT) ou accès refusé (EACCES).
    console.error(`Photo illisible : ${nom} (${(e as NodeJS.ErrnoException).code ?? e})`);
    return null;
  }
}

export async function supprimerPhoto(identifiant: string | null | undefined) {
  if (!identifiant || !IDENTIFIANT.test(identifiant)) return;
  await Promise.all(
    [`${identifiant}.webp`, `${identifiant}-v.webp`].map((nom) => unlink(path.join(dossier(), nom)).catch(() => {})),
  );
}
