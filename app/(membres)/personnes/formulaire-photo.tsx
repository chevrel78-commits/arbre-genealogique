"use client";
// Boutons de la photo sur la fiche : choisir un fichier l'envoie aussitôt.
import { useActionState, useRef, useState } from "react";
import { envoyerPhoto, retirerPhoto, type EtatPhoto } from "./photo-actions";
import { BoutonConfirme } from "@/components/bouton-confirme";
import { Erreur } from "@/components/formulaire";
import { TAILLE_PHOTO_MAX } from "@/lib/personnes";

const bouton = "inline-block cursor-pointer rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux";

export function FormulairePhoto({ id, aUnePhoto, nom }: { id: number; aUnePhoto: boolean; nom: string }) {
  const [etat, action, enCours] = useActionState<EtatPhoto, FormData>(envoyerPhoto, {});
  const [erreurLocale, setErreurLocale] = useState<string>();
  const formulaire = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form ref={formulaire} action={action}>
          <input type="hidden" name="id" value={id} />
          <label className={`${bouton} ${enCours ? "pointer-events-none opacity-60" : ""} has-focus-visible:outline-2 has-focus-visible:outline-arbre`}>
            {enCours ? "Envoi de la photo…" : aUnePhoto ? "Remplacer la photo" : "Ajouter une photo"}
            <input
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
                formulaire.current?.requestSubmit();
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
    </div>
  );
}
