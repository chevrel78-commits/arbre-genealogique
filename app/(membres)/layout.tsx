import { Suspense } from "react";
import Link from "next/link";
import { membreDeLaSession } from "@/lib/session";
import { seDeconnecter } from "../actions-session";

// Mise en page des pages réservées aux membres : bandeau avec le nom du membre et « Se déconnecter ».
// (Chaque page appelle elle-même exigerMembre() : c'est la page qui protège, pas ce bandeau.)

async function MembreConnecte() {
  const membre = await membreDeLaSession();
  if (!membre) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-foreground/70">
        {membre.prenom} {membre.nom}
        {(membre.admin || membre.superAdmin) && (
          <span className="ml-2 rounded-full bg-arbre-doux px-2 py-0.5 text-xs font-medium text-arbre">Administrateur</span>
        )}
      </span>
      <form action={seDeconnecter}>
        <button type="submit" className="rounded-lg border border-black/15 px-3 py-1 hover:bg-black/5">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}

export default function MiseEnPageMembres({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3">
        <Link href="/" className="font-semibold text-arbre">
          Arbre généalogique
        </Link>
        <Suspense fallback={null}>
          <MembreConnecte />
        </Suspense>
      </header>
      {children}
    </>
  );
}
