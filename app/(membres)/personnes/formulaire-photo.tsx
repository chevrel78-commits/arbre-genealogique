"use client";
// Boutons de la photo sur la fiche : choisir un fichier ouvre le recadrage, « Valider » l'envoie.
import { useActionState, useRef, useState } from "react";
import { envoyerPhoto, retirerPhoto, type EtatPhoto } from "./photo-actions";
import { RecadragePhoto, type ZoneRecadrage } from "./recadrage-photo";
import { BoutonConfirme } from "@/components/bouton-confirme";
import { Erreur } from "@/components/formulaire";
import { TAILLE_PHOTO_MAX } from "@/lib/personnes";

const bouton = "inline-block cursor-pointer rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux";

export function FormulairePhoto({ id, aUnePhoto, nom }: { id: number; aUnePhoto: boolean; nom: string }) {
  const [etat, action, enCours] = useActionState<EtatPhoto, FormData>(envoyerPhoto, {});
  const [erreurLocale, setErreurLocale] = useState<string>();
  const [apercu, setApercu] = useState<string | null>(null);
  const formulaire = useRef<HTMLFormElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const champX = useRef<HTMLInputElement>(null);
  const champY = useRef<HTMLInputElement>(null);
  const champCote = useRef<HTMLInputElement>(null);

  const fermer = (viderFichier: boolean) => {
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(null);
    if (viderFichier && champFichier.current) champFichier.current.value = "";
  };

  const valider = (zone: ZoneRecadrage) => {
    if (champX.current) champX.current.value = String(zone.x);
    if (champY.current) champY.current.value = String(zone.y);
    if (champCote.current) champCote.current.value = String(zone.cote);
    fermer(false);
    formulaire.current?.requestSubmit();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form ref={formulaire} action={action}>
          <input type="hidden" name="id" value={id} />
          <input ref={champX} type="hidden" name="recadrageX" />
          <input ref={champY} type="hidden" name="recadrageY" />
          <input ref={champCote} type="hidden" name="recadrageCote" />
          <label className={`${bouton} ${enCours ? "pointer-events-none opacity-60" : ""} has-focus-visible:outline-2 has-focus-visible:outline-arbre`}>
            {enCours ? "Envoi de la photo…" : aUnePhoto ? "Remplacer la photo" : "Ajouter une photo"}
            <input
              ref={champFichier}
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              disabled={enCours}
              className="sr-only"
              onChange={(e) => {
                const fichier = e.target.files?.[0];
                if (!fichier) return;
                if (fichier.size > TAILLE_PHOTO_MAX) {
                  setErreurLocale("Cette photo est trop lourde (10 Mo au plus).");
                  e.target.value = "";
                  return;
                }
                setErreurLocale(undefined);
                setApercu(URL.createObjectURL(fichier));
              }}
            />
          </label>
        </form>
        {aUnePhoto && (
          <form action={retirerPhoto}>
            <input type="hidden" name="id" value={id} />
            <BoutonConfirme message={`Retirer la photo de ${nom} ? Elle sera définitivement effacée.`} className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50">
              Retirer la photo
            </BoutonConfirme>
          </form>
        )}
      </div>
      <Erreur>{erreurLocale ?? etat.erreur}</Erreur>
      {apercu && (
        <RecadragePhoto
          key={apercu}
          url={apercu}
          onValider={valider}
          onAnnuler={() => fermer(true)}
          onErreur={() => {
            fermer(true);
            setErreurLocale("Ce fichier n'est pas une image lisible.");
          }}
        />
      )}
    </div>
  );
}
