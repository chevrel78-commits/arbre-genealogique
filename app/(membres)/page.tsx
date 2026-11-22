import { Suspense } from "react";
import { exigerMembre } from "@/lib/acces";

// Accueil des membres (provisoire). L'arbre lui-même arrivera aux étapes 3 à 5.

async function Bienvenue() {
  // Protection : sans session valide (ou compte non accepté), renvoi vers /connexion.
  const membre = await exigerMembre();
  return (
    <>
      <h1 className="text-3xl font-semibold sm:text-4xl">Bonjour {membre.prenom}</h1>
      <p className="max-w-md text-foreground/70">
        Vous êtes connecté à l&apos;arbre généalogique de la famille. L&apos;arbre lui-même est en construction.
      </p>
    </>
  );
}

export default function Accueil() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <svg viewBox="0 0 64 64" className="h-20 w-20 text-arbre" aria-hidden="true">
        <circle cx="32" cy="24" r="18" fill="currentColor" opacity="0.85" />
        <rect x="29" y="34" width="6" height="22" rx="2" fill="#6b4a2b" />
      </svg>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Bienvenue />
      </Suspense>
    </main>
  );
}
