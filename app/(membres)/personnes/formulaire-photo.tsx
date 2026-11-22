"use client";
// Boutons de la photo sur la fiche : choisir un fichier ouvre le recadrage, « Valider » l'envoie.
// La photo est recadrée et allégée ici, dans le navigateur : l'envoi est court et le serveur a peu à faire.
import { useRef, useState, useTransition } from "react";
import { envoyerPhoto, retirerPhoto } from "./photo-actions";
import { RecadragePhoto, type ZoneRecadrage } from "./recadrage-photo";
import { BoutonConfirme } from "@/components/bouton-confirme";
import { Erreur } from "@/components/formulaire";
import { TAILLE_PHOTO_MAX } from "@/lib/personnes";

const bouton = "inline-block cursor-pointer rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux";
const COTE_ENVOI = 1600;

// Découpe la zone choisie et la réduit. Renvoie null si le navigateur n'y arrive pas (image trop grande).
async function preparerImage(url: string, zone: ZoneRecadrage): Promise<Blob | null> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const l = image.naturalWidth;
  const h = image.naturalHeight;
  const cote = Math.max(1, Math.min(Math.round(zone.cote * l), l, h));
  const x = Math.max(0, Math.min(Math.round(zone.x * l), l - cote));
  const y = Math.max(0, Math.min(Math.round(zone.y * h), h - cote));
  const sortie = Math.min(COTE_ENVOI, cote);

  const toile = document.createElement("canvas");
  toile.width = sortie;
  toile.height = sortie;
  const contexte = toile.getContext("2d");
  if (!contexte) return null;
  contexte.fillStyle = "#fff"; // fond blanc pour les images PNG transparentes
  contexte.fillRect(0, 0, sortie, sortie);
  contexte.imageSmoothingQuality = "high";
  contexte.drawImage(image, x, y, cote, cote, 0, 0, sortie, sortie);
  return new Promise((resoudre) => toile.toBlob(resoudre, "image/jpeg", 0.92));
}

export function FormulairePhoto({ id, aUnePhoto, nom }: { id: number; aUnePhoto: boolean; nom: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string>();
  const [apercu, setApercu] = useState<string | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const annuler = () => {
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(null);
    if (champFichier.current) champFichier.current.value = "";
  };

  const valider = (zone: ZoneRecadrage) => {
    const url = apercu;
    const original = champFichier.current?.files?.[0];
    setApercu(null);
    if (!url) return;
    demarrer(async () => {
      try {
        const donnees = new FormData();
        donnees.set("id", String(id));
        const image = await preparerImage(url, zone).catch(() => null);
        if (image) donnees.set("photo", new File([image], "photo.jpg", { type: "image/jpeg" }));
        else if (original) {
          // Solution de secours : le serveur fait lui-même le recadrage. Le fichier est renommé, car un nom
          // avec espaces ou accents fait échouer l'envoi sur l'hébergement.
          donnees.set("photo", new File([original], "photo", { type: original.type }));
          donnees.set("recadrageX", String(zone.x));
          donnees.set("recadrageY", String(zone.y));
          donnees.set("recadrageCote", String(zone.cote));
        } else {
          setErreur("Choisissez une photo.");
          return;
        }
        const reponse = await envoyerPhoto({}, donnees);
        setErreur(reponse.erreur);
      } catch (e) {
        // Connexion coupée ou réponse invalide : on l'explique, sans faire tomber la page.
        console.error("Envoi de la photo impossible :", e);
        setErreur("L'envoi de la photo a échoué. Vérifiez votre connexion, rechargez la page, puis réessayez.");
      } finally {
        URL.revokeObjectURL(url);
        if (champFichier.current) champFichier.current.value = "";
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${bouton} ${enCours ? "pointer-events-none opacity-60" : ""} has-focus-visible:outline-2 has-focus-visible:outline-arbre`}>
          {enCours ? "Envoi de la photo…" : aUnePhoto ? "Remplacer la photo" : "Ajouter une photo"}
          <input
            ref={champFichier}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={enCours}
            className="sr-only"
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              if (!fichier) return;
              if (fichier.size > TAILLE_PHOTO_MAX) {
                setErreur("Cette photo est trop lourde (10 Mo au plus).");
                e.target.value = "";
                return;
              }
              setErreur(undefined);
              setApercu(URL.createObjectURL(fichier));
            }}
          />
        </label>
        {aUnePhoto && (
          <form action={retirerPhoto}>
            <input type="hidden" name="id" value={id} />
            <BoutonConfirme message={`Retirer la photo de ${nom} ? Elle sera définitivement effacée.`} className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50">
              Retirer la photo
            </BoutonConfirme>
          </form>
        )}
      </div>
      <Erreur>{erreur}</Erreur>
      {apercu && (
        <RecadragePhoto
          key={apercu}
          url={apercu}
          onValider={valider}
          onAnnuler={annuler}
          onErreur={() => {
            annuler();
            setErreur("Ce fichier n'est pas une image lisible.");
          }}
        />
      )}
    </div>
  );
}
