"use client";
// Liste du statut d'un couple sur la fiche : changer la valeur l'enregistre aussitôt.
import { useRef } from "react";
import { changerStatutCouple } from "./liens-actions";

export function StatutCouple({ sourceId, familleId, statut, conjoint }: { sourceId: number; familleId: number; statut: string; conjoint: string }) {
  const formulaire = useRef<HTMLFormElement>(null);
  return (
    <form ref={formulaire} action={changerStatutCouple} className="text-center">
      <input type="hidden" name="source" value={sourceId} />
      <input type="hidden" name="famille" value={familleId} />
      <select
        key={statut}
        name="statut"
        defaultValue={statut}
        aria-label={`Statut du couple avec ${conjoint}`}
        onChange={() => formulaire.current?.requestSubmit()}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs"
      >
        <option value="marie">Mariés</option>
        <option value="couple">En couple</option>
        <option value="divorce">Divorcés</option>
      </select>
    </form>
  );
}
