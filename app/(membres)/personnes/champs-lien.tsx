"use client";
// Choix propres à un lien : de quelle union est issu un enfant, couple marié ou non, enfants communs.
import type { EtatPersonne } from "@/lib/formulaire-personne";

export type OptionsFormulaireLien = {
  unions?: { valeur: string; libelle: string }[];
  unionParDefaut?: string;
  avecMarie?: boolean;
  avecEnfantsCommuns?: boolean;
};

export function ChampsLien({ options, etat }: { options?: OptionsFormulaireLien; etat: EtatPersonne }) {
  if (!options) return null;
  const unionChoisie = etat.union ?? options.unionParDefaut;
  return (
    <>
      {options.unions && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Cet enfant est issu de quelle union ?</legend>
          {options.unions.map((u) => (
            <label key={u.valeur} className="flex items-center gap-2 text-sm">
              <input type="radio" name="union" value={u.valeur} required defaultChecked={unionChoisie === u.valeur} className="accent-arbre" />
              {u.libelle}
            </label>
          ))}
        </fieldset>
      )}
      {options.avecMarie && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="marie" defaultChecked={etat.marie ?? true} className="accent-arbre" />
          Mariés (décochez pour un couple non marié)
        </label>
      )}
      {options.avecEnfantsCommuns && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enfantsCommuns" defaultChecked={etat.enfantsCommuns ?? true} className="accent-arbre" />
          Ses enfants sans autre parent connu sont aussi ceux de ce conjoint
        </label>
      )}
    </>
  );
}
