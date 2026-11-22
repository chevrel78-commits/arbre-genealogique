import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { OptionsFormulaireLien } from "../../../champs-lien";
import { FormulairePersonne } from "../../../formulaire";
import { FormulaireRelier } from "../../../formulaire-relier";
import { ajouterNouveauProche } from "../../../liens-actions";
import { classeChamp } from "@/components/formulaire";
import { exigerMembre } from "@/lib/acces";
import type { ValeursPersonne } from "@/lib/formulaire-personne";
import { chargerProches, chercherCandidats } from "@/lib/liens";
import { estTypeLien, identifiantValide, LIENS, type TypeLien } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ajouter un proche · Arbre généalogique" };

type Proches = NonNullable<Awaited<ReturnType<typeof chargerProches>>>;
type Source = { civilite: string; nom: string; nomJeuneFille: string | null };

// Pré-remplit la civilité et, quand c'est logique, le nom de famille.
function valeursInitiales(lien: TypeLien, source: Source, proches: Proches): Partial<ValeursPersonne> {
  // Le nom de naissance de la personne : celui de son père et de ses frères et sœurs.
  const nomNaissance = source.civilite !== "M" && source.nomJeuneFille ? source.nomJeuneFille : source.nom;
  if (lien === "pere") return { civilite: "M", nom: nomNaissance };
  if (lien === "mere") return { civilite: "MME" };
  if (lien === "frere") return { civilite: "M", nom: nomNaissance };
  if (lien === "soeur") return { civilite: "MME", nom: nomNaissance };
  if (lien === "enfant") {
    const conjointHomme = proches.unions.find((u) => u.conjoint?.civilite === "M")?.conjoint;
    return { nom: source.civilite === "M" ? source.nom : (conjointHomme?.nom ?? source.nom) };
  }
  return {};
}

function optionsDuLien(lien: TypeLien, proches: Proches): OptionsFormulaireLien | undefined {
  if (lien === "conjoint")
    return { avecMarie: true, avecEnfantsCommuns: proches.unions.some((u) => u.conjoint === null && u.enfants.length > 0) };
  if (lien === "enfant") {
    const couples = proches.unions.filter((u) => u.conjoint !== null);
    if (couples.length === 0) return undefined;
    const unions = [
      ...couples.map((u) => ({ valeur: String(u.id), libelle: `Avec ${u.conjoint!.prenom} ${u.conjoint!.nom}` })),
      { valeur: "seul", libelle: "Autre parent inconnu" },
    ];
    return { unions, unionParDefaut: unions[0].valeur };
  }
  return undefined;
}

async function Contenu({
  parametres,
  recherche,
}: {
  parametres: Promise<{ id: string; lien: string }>;
  recherche: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigerMembre();
  const { id: idTexte, lien } = await parametres;
  const id = identifiantValide(idTexte);
  if (id === null || !estTypeLien(lien)) notFound();
  const [source, proches] = await Promise.all([
    prisma.personne.findUnique({ where: { id }, select: { prenom: true, nom: true, civilite: true, nomJeuneFille: true } }),
    chargerProches(id),
  ]);
  if (!source || !proches) notFound();

  const retour = `/personnes/${id}`;
  const dejaRenseigne =
    (lien === "pere" && proches.parents.some((x) => x.civilite === "M")) ||
    (lien === "mere" && proches.parents.some((x) => x.civilite !== "M"));

  const q = (await recherche).q;
  const texteRecherche = (typeof q === "string" ? q : "").slice(0, 100);
  const exclus = new Set<number>([
    id,
    ...proches.parents.map((x) => x.id),
    ...proches.freres.map((x) => x.id),
    ...proches.enfants.map((x) => x.id),
    ...proches.unions.flatMap((u) => (u.conjoint ? [u.conjoint.id] : [])),
  ]);
  const candidats = dejaRenseigne ? [] : await chercherCandidats(lien, exclus, texteRecherche);
  const options = optionsDuLien(lien, proches);

  return (
    <>
      <div>
        <Link href={retour} className="text-sm text-arbre underline">
          ← Retour à la fiche
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">
          Ajouter {LIENS[lien].titre} à {source.prenom} {source.nom}
        </h1>
      </div>

      {dejaRenseigne ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Ce parent est déjà renseigné sur la fiche.</p>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold">Une personne déjà dans l&apos;arbre</h2>
            <form method="get" className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={texteRecherche}
                maxLength={100}
                aria-label="Rechercher par nom"
                placeholder="Rechercher par nom ou prénom"
                className={`${classeChamp} min-w-0 flex-1`}
              />
              <button type="submit" className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
                Rechercher
              </button>
            </form>
            {candidats.length === 0 ? (
              <p className="text-sm text-foreground/60">Aucune personne à proposer.</p>
            ) : (
              <FormulaireRelier sourceId={id} lien={lien} candidats={candidats} options={options} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Ou une nouvelle personne</h2>
            <FormulairePersonne
              initiales={valeursInitiales(lien, source, proches)}
              actionServeur={ajouterNouveauProche}
              champsCaches={{ source: String(id), lien }}
              optionsLien={options}
              retour={retour}
            />
          </section>
        </>
      )}
    </>
  );
}

export default function PageAjouterProche({ params, searchParams }: PageProps<"/personnes/[id]/ajouter/[lien]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu parametres={params} recherche={searchParams} />
      </Suspense>
    </main>
  );
}
