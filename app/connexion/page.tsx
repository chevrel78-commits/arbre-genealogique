import type { Metadata } from "next";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Se connecter · Arbre généalogique" };

// Seule page visible sans être connecté.
export default function PageConnexion() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-arbre" aria-hidden="true">
        <circle cx="32" cy="24" r="18" fill="currentColor" opacity="0.85" />
        <rect x="29" y="34" width="6" height="22" rx="2" fill="#6b4a2b" />
      </svg>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Arbre généalogique</h1>
        <p className="mt-1 text-foreground/70">Site privé de la famille : connectez-vous pour entrer.</p>
      </div>
      <FormulaireConnexion />
    </main>
  );
}
