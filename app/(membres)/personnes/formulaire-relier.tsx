"use client";
// Relier une personne déjà présente dans l'arbre : un bouton par personne trouvée.
import { useActionState } from "react";
import { ChampsLien, type OptionsFormulaireLien } from "./champs-lien";
import { relierProche } from "./liens-actions";
import { Erreur } from "@/components/formulaire";
import { Portrait, type PersonneTuile } from "@/components/tuile-personne";
import type { EtatPersonne } from "@/lib/formulaire-personne";
import { accordNe, CIVILITES } from "@/lib/personnes";

export function FormulaireRelier({
  sourceId,
  lien,
  candidats,
  options,
}: {
  sourceId: number;
  lien: string;
  candidats: PersonneTuile[];
  options?: OptionsFormulaireLien;
}) {
  const [etat, action, enCours] = useActionState<EtatPersonne, FormData>(relierProche, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="source" value={sourceId} />
      <input type="hidden" name="lien" value={lien} />
      <ChampsLien options={options} etat={etat} />
      <Erreur>{etat.erreur}</Erreur>
      <ul className="flex flex-col divide-y divide-black/5">
        {candidats.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-3">
              <span className="origin-left scale-75">
                <Portrait prenom={c.prenom} nom={c.nom} photo={c.photo} />
              </span>
              <span className="min-w-0">
                <span className="block break-words font-medium">
                  {CIVILITES[c.civilite]} {c.prenom} {c.nom}
                </span>
                {(c.nomJeuneFille || c.anneeNaissance !== null) && (
                  <span className="block text-xs text-foreground/60">
                    {[c.nomJeuneFille && `${accordNe(c.civilite)} ${c.nomJeuneFille}`, c.anneeNaissance].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </span>
            <button
              type="submit"
              name="cibleId"
              value={c.id}
              disabled={enCours}
              className="shrink-0 rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux disabled:opacity-60"
            >
              Relier
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
