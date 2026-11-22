// Hachage des mots de passe avec scrypt (intégré à Node.js, aucune bibliothèque à ajouter).
// « Hacher » = transformer de façon irréversible : on ne garde jamais le mot de passe, seulement
// son empreinte. À la connexion, on refait le calcul et on compare les deux empreintes.
// scrypt est volontairement lent et gourmand en mémoire : un pirate qui volerait la base mettrait
// des années à retrouver les mots de passe en les essayant un par un.
import { randomBytes, scrypt as scryptRappel, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (mdp: string, sel: Buffer, longueur: number, options: ScryptOptions) =>
  new Promise<Buffer>((resoudre, rejeter) =>
    scryptRappel(mdp, sel, longueur, options, (err, cle) => (err ? rejeter(err) : resoudre(cle))),
  );

// Réglages de scrypt (N = coût, r = taille de bloc, p = parallélisme), gardés dans l'empreinte
// pour pouvoir les renforcer plus tard sans invalider les anciens mots de passe.
const N = 16384;
const R = 8;
const P = 1;
const LONGUEUR = 64;

export const LONGUEUR_MINIMALE = 10;

// Format stocké : scrypt$N$r$p$sel$empreinte (sel et empreinte en base64).
export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scrypt(motDePasse.normalize("NFC"), sel, LONGUEUR, { N, r: R, p: P });
  return ["scrypt", N, R, P, sel.toString("base64"), cle.toString("base64")].join("$");
}

export async function verifierMotDePasse(motDePasse: string, stocke: string): Promise<boolean> {
  const [algo, n, r, p, sel, empreinte] = stocke.split("$");
  if (algo !== "scrypt" || !sel || !empreinte) return false;
  const attendu = Buffer.from(empreinte, "base64");
  const cle = await scrypt(motDePasse.normalize("NFC"), Buffer.from(sel, "base64"), attendu.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  // Comparaison « à temps constant » : elle prend toujours le même temps, pour ne rien laisser deviner.
  return cle.length === attendu.length && timingSafeEqual(cle, attendu);
}

// Empreinte factice : quand l'e-mail est inconnu, on fait quand même le calcul, pour que la réponse
// prenne le même temps et ne révèle pas si l'adresse a un compte.
let empreinteFactice: Promise<string> | undefined;
export function empreinteLeurre() {
  empreinteFactice ??= hacherMotDePasse(randomBytes(16).toString("hex"));
  return empreinteFactice;
}
