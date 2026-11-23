import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormulairePersonne } from "../formulaire";
import { OngletsAjout } from "../onglets-ajout";
import { RecherchePersonne } from "../recherche-personne";
import { Portrait } from "@/components/tuile-personne";
import { exigerMembre } from "@/lib/acces";
import { chercherCandidats } from "@/lib/liens";
import { anneesDeVie, CIVILITES } from "@/lib/personnes";

export const metadata: Metadata = { title: "Ajouter une personne · Arbre généalogique" };

async function Contenu({ recherche }: { recherche: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerMembre();
  const { q } = await recherche;
  const texte = (typeof q === "string" ? q : "").slice(0, 100);
  // Depuis l'accueil, il n'y a personne à relier : cet onglet sert à éviter de créer un doublon.
  const personnes = await chercherCandidats(null, new Set(), texte);

  return (
    <OngletsAjout
      ouvrirExistante={typeof q === "string"}
      nouvelle={<FormulairePersonne />}
      existante={
        <RecherchePersonne texte={texte}>
          <p className="text-sm text-foreground/60">Vérifiez ici que la personne n&apos;existe pas déjà, puis ouvrez sa fiche.</p>
          {personnes.length === 0 ? (
            <p className="text-sm text-foreground/60">Aucune personne trouvée.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-black/5">
              {personnes.map((p) => (
                <li key={p.id}>
                  <Link href={`/personnes/${p.id}`} prefetch={false} className="flex items-center justify-between gap-3 rounded-lg py-2 hover:bg-arbre-doux/50">
                    <span className="flex min-w-0 items-center gap-3">
                      <Portrait prenom={p.prenom} nom={p.nom} photo={p.photo} petit />
                      <span className="min-w-0">
                        <span className="block break-words font-medium">
                          {CIVILITES[p.civilite]} {p.prenom} {p.nom}
                        </span>
                        {anneesDeVie(p) && <span className="block text-xs text-foreground/60">{anneesDeVie(p)}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 pr-2 text-sm font-medium text-arbre">Ouvrir la fiche</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </RecherchePersonne>
      }
    />
  );
}

export default function PageNouvellePersonne({ searchParams }: PageProps<"/personnes/nouvelle">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Ajouter une personne</h1>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu recherche={searchParams} />
      </Suspense>
    </main>
  );
}
