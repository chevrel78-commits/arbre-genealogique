// Contenu de l'onglet « Personne existante » : une recherche par nom, puis la liste des résultats.
import type { ReactNode } from "react";
import { classeChamp } from "@/components/formulaire";

export function RecherchePersonne({ texte, children }: { texte: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={texte}
          maxLength={100}
          aria-label="Rechercher par nom"
          placeholder="Rechercher par nom ou prénom"
          className={`${classeChamp} min-w-0 flex-1`}
        />
        <button type="submit" className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
          Rechercher
        </button>
      </form>
      {children}
    </section>
  );
}
