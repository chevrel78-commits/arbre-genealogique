import { Suspense } from "react";
import Link from "next/link";
import { LienSupport } from "@/components/lien-support";
import { membreDeLaSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { seDeconnecter } from "../actions-session";

// Mise en page des pages réservées aux membres : bandeau avec le nom du membre et « Se déconnecter ».
// (Chaque page appelle elle-même exigerMembre() : c'est la page qui protège, pas ce bandeau.)

async function MembreConnecte() {
  const membre = await membreDeLaSession();
  if (!membre) return null;
  const estAdmin = membre.admin || membre.superAdmin;
  // Pour un administrateur : nombre de demandes d'accès qui attendent une réponse.
  const enAttente = estAdmin ? await prisma.membre.count({ where: { statut: "EN_ATTENTE" } }) : 0;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link href="/activite" prefetch={false} className="rounded-lg px-3 py-1 font-medium text-arbre hover:bg-arbre-doux">
        Activité
      </Link>
      <Link
        href="/aide"
        prefetch={false}
        title="Aide"
        aria-label="Aide"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-arbre/40 font-semibold text-arbre hover:bg-arbre-doux"
      >
        ?
      </Link>
      <LienSupport compact />
      {estAdmin && (
        <Link href="/admin" className="rounded-lg px-3 py-1 font-medium text-arbre hover:bg-arbre-doux">
          Administration
          {enAttente > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white" title="Demandes en attente">
              {enAttente}
            </span>
          )}
        </Link>
      )}
      <span className="text-foreground/70">
        {membre.prenom} {membre.nom}
        {estAdmin && (
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
