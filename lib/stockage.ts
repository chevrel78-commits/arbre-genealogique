// Stockage des photos des personnes : un dossier sur le serveur, hors du site (STOCKAGE_MEDIAS),
// pour qu'elles survivent aux publications. Seul module qui touche à ces fichiers.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TAILLE_PHOTO_MAX } from "./personnes";

const COTE_GRANDE = 1200;
const COTE_GALERIE = 1600; // plus grand que le portrait : les visages d'une photo de groupe restent lisibles
const COTE_VIGNETTE = 240;
const FORMATS_ACCEPTES = ["jpeg", "png", "webp"];

// Noms générés ici : un identifiant aléatoire, jamais le nom d'origine ni celui de la personne.
const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NOM_FICHIER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}((-v)?\.webp|\.pdf)$/;

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

type ImagesGalerie = { grande: { data: Buffer; info: { width: number; height: number } }; vignette: Buffer };

// Grande image (cadrage d'origine) et vignette carrée, sans aucune métadonnée. La vignette d'une photo
// est centrée sur le sujet ; celle d'un document montre le haut de la page (titre, en-tête).
async function imagesGalerie(entree: Buffer, document: boolean): Promise<ImagesGalerie> {
  const { format } = await sharp(entree).metadata();
  if (!format || !FORMATS_ACCEPTES.includes(format)) throw new PhotoInvalide("Format non accepté : envoyez une image JPEG, PNG ou WebP.");
  const [grande, vignette] = await Promise.all([
    sharp(entree).rotate().resize({ width: COTE_GALERIE, height: COTE_GALERIE, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true }),
    sharp(entree)
      .rotate()
      .resize({ width: COTE_VIGNETTE, height: COTE_VIGNETTE, fit: "cover", position: document ? "top" : sharp.strategy.attention })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);
  return { grande, vignette };
}

// Écrit les fichiers sous un nom aléatoire ; en cas d'échec, rien ne reste à moitié écrit.
async function ecrireGalerie(images: ImagesGalerie, pdf?: Buffer) {
  const identifiant = randomUUID();
  await mkdir(dossier(), { recursive: true });
  try {
    await writeFile(path.join(dossier(), `${identifiant}.webp`), images.grande.data);
    await writeFile(path.join(dossier(), `${identifiant}-v.webp`), images.vignette);
    if (pdf) await writeFile(path.join(dossier(), `${identifiant}.pdf`), pdf);
  } catch (e) {
    await supprimerPhoto(identifiant);
    throw e;
  }
  return { identifiant, largeur: images.grande.info.width, hauteur: images.grande.info.height };
}

// Photo de galerie : cadrage d'origine conservé, vignette carrée centrée sur le sujet, aucune métadonnée.
export async function enregistrerPhotoGalerie(fichier: File): Promise<{ identifiant: string; largeur: number; hauteur: number }> {
  if (fichier.size === 0) throw new PhotoInvalide("Choisissez une photo.");
  if (fichier.size > TAILLE_PHOTO_MAX) throw new PhotoInvalide("Cette photo est trop lourde (10 Mo au plus).");
  let images: ImagesGalerie;
  try {
    images = await imagesGalerie(Buffer.from(await fichier.arrayBuffer()), false);
  } catch (e) {
    if (e instanceof PhotoInvalide) throw e;
    console.error("Photo de galerie non traitée :", e);
    throw new PhotoInvalide("Cette image n'a pas pu être traitée. Essayez avec une autre photo.");
  }
  return ecrireGalerie(images);
}

// Page blanche stylisée (format A4, sans texte : le serveur n'a pas forcément de polices), utilisée quand
// le navigateur n'a pas pu dessiner la première page du PDF.
const PAGE_GENERIQUE = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1131" height="1600" viewBox="0 0 1131 1600">
    <rect width="1131" height="1600" fill="#f4f1ea"/>
    <path d="M265 250h450l150 150v950H265z" fill="#fff" stroke="#b9b2a3" stroke-width="12"/>
    <path d="M715 250v150h150" fill="#ece7dc" stroke="#b9b2a3" stroke-width="12"/>
    <rect x="345" y="520" width="440" height="26" rx="13" fill="#d8d2c4"/>
    <rect x="345" y="610" width="440" height="26" rx="13" fill="#d8d2c4"/>
    <rect x="345" y="700" width="320" height="26" rx="13" fill="#d8d2c4"/>
    <rect x="345" y="1120" width="230" height="110" rx="18" fill="#b42318"/>
  </svg>`,
);

// Document PDF : le fichier est gardé tel quel (ses informations internes ne sont pas retirées) ; seule
// l'image de sa première page, dessinée dans le navigateur, sert d'aperçu et de vignette.
export async function enregistrerDocumentGalerie(pdf: File, apercu: File | null): Promise<{ identifiant: string; largeur: number; hauteur: number }> {
  if (pdf.size === 0) throw new PhotoInvalide("Choisissez un document.");
  if (pdf.size > TAILLE_PHOTO_MAX) throw new PhotoInvalide("Ce document est trop lourd (10 Mo au plus).");
  const contenu = Buffer.from(await pdf.arrayBuffer());
  // Un vrai PDF commence par « %PDF- » : le nom ou le type annoncé par le navigateur ne suffit pas.
  if (!contenu.subarray(0, 1024).includes("%PDF-")) throw new PhotoInvalide("Ce fichier n'est pas un PDF valide.");

  let images: ImagesGalerie | null = null;
  if (apercu && apercu.size > 0 && apercu.size <= TAILLE_PHOTO_MAX) {
    try {
      images = await imagesGalerie(Buffer.from(await apercu.arrayBuffer()), true);
    } catch (e) {
      console.error("Aperçu du document non traité :", e instanceof Error ? e.message : e);
    }
  }
  images ??= {
    grande: await sharp(PAGE_GENERIQUE).webp({ quality: 85 }).toBuffer({ resolveWithObject: true }),
    vignette: await sharp(PAGE_GENERIQUE).resize({ width: COTE_VIGNETTE, height: COTE_VIGNETTE, fit: "cover" }).webp({ quality: 80 }).toBuffer(),
  };
  return ecrireGalerie(images, contenu);
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
    [`${identifiant}.webp`, `${identifiant}-v.webp`, `${identifiant}.pdf`].map((nom) => unlink(path.join(dossier(), nom)).catch(() => {})),
  );
}
