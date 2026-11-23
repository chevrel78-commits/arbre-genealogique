"use client";
// Deux onglets dans les fenêtres d'ajout : « Nouvelle personne » et « Personne existante ».
// Les deux contenus restent chargés : changer d'onglet ne perd pas ce qui a été saisi.
import { useState, type KeyboardEvent, type ReactNode } from "react";

type Onglet = "nouvelle" | "existante";

export function OngletsAjout({ nouvelle, existante, ouvrirExistante }: { nouvelle: ReactNode; existante: ReactNode; ouvrirExistante: boolean }) {
  const [actif, setActif] = useState<Onglet>(ouvrirExistante ? "existante" : "nouvelle");

  const clavier = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const suivant = actif === "nouvelle" ? "existante" : "nouvelle";
    setActif(suivant);
    document.getElementById(`onglet-${suivant}`)?.focus();
  };

  const bouton = (id: Onglet, texte: string) => (
    <button
      id={`onglet-${id}`}
      type="button"
      role="tab"
      aria-selected={actif === id}
      aria-controls={`panneau-${id}`}
      tabIndex={actif === id ? 0 : -1}
      onClick={() => setActif(id)}
      onKeyDown={clavier}
      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${actif === id ? "bg-arbre text-white" : "text-arbre hover:bg-arbre-doux"}`}
    >
      {texte}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Type d'ajout" className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-black/10">
        {bouton("nouvelle", "Nouvelle personne")}
        {bouton("existante", "Personne existante")}
      </div>
      <div id="panneau-nouvelle" role="tabpanel" aria-labelledby="onglet-nouvelle" hidden={actif !== "nouvelle"}>
        {nouvelle}
      </div>
      <div id="panneau-existante" role="tabpanel" aria-labelledby="onglet-existante" hidden={actif !== "existante"}>
        {existante}
      </div>
    </div>
  );
}
