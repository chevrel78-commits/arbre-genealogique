"use client";
// Recherche d'une personne pour centrer l'arbre sur elle (sans tenir compte des accents ni des majuscules).
import Link from "next/link";
import { useState } from "react";
import { classeChamp } from "@/components/formulaire";

type Entree = { id: number; prenom: string; nom: string; nomJeuneFille: string | null; anneeNaissance: number | null };

const normaliser = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function RechercheArbre({ personnes }: { personnes: Entree[] }) {
  const [texte, setTexte] = useState("");
  const mots = normaliser(texte).split(/\s+/).filter(Boolean);
  const resultats =
    mots.length === 0
      ? []
      : personnes.filter((p) => mots.every((m) => normaliser(`${p.prenom} ${p.nom} ${p.nomJeuneFille ?? ""}`).includes(m))).slice(0, 8);

  return (
    <div className="group relative w-full sm:w-72">
      <input
        type="search"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        maxLength={100}
        aria-label="Chercher une personne dans l'arbre"
        placeholder="Chercher une personne"
        className={`${classeChamp} w-full bg-white`}
      />
      {mots.length > 0 && (
        <ul className="absolute z-20 mt-1 hidden w-full overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/10 group-focus-within:block">
          {resultats.length === 0 && <li className="px-3 py-2 text-sm text-foreground/60">Aucune personne trouvée.</li>}
          {resultats.map((p) => (
            <li key={p.id}>
              <Link href={`/?centre=${p.id}`} prefetch={false} scroll={false} onClick={() => setTexte("")} className="block px-3 py-2 text-sm hover:bg-arbre-doux">
                {p.prenom} {p.nom}
                {p.anneeNaissance !== null && <span className="text-foreground/60"> · {p.anneeNaissance}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
