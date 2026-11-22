import Link from "next/link";
import { Suspense } from "react";
import { RechercheArbre } from "@/components/recherche-arbre";
import { TuilePersonne } from "@/components/tuile-personne";
import { VueArbre } from "@/components/vue-arbre";
import { exigerMembre } from "@/lib/acces";
import { centreParDefaut } from "@/lib/disposition-arbre";
import { identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

// Accueil des membres : l'arbre centré sur une personne, ou la liste de toutes les personnes.

const boutonAjouter = "rounded-lg bg-arbre px-4 py-2 text-center font-medium text-white hover:opacity-90";

function Onglet({ href, actif, children }: { href: string; actif: boolean; children: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={actif ? "page" : undefined}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${actif ? "bg-arbre text-white" : "text-arbre hover:bg-arbre-doux"}`}
    >
      {children}
    </Link>
  );
}

async function Contenu({ recherche }: { recherche: Promise<Record<string, string | string[] | undefined>> }) {
  // Protection : sans session valide (ou compte non accepté), renvoi vers /connexion.
  const membre = await exigerMembre();
  const [personnes, familles, parametres] = await Promise.all([
    prisma.personne.findMany({
      orderBy: [{ nom: "asc" }, { prenom: "asc" }, { id: "asc" }],
      select: { id: true, civilite: true, prenom: true, nom: true, nomJeuneFille: true, anneeNaissance: true, photo: true, familleOrigineId: true },
    }),
    prisma.famille.findMany({ select: { id: true, parent1Id: true, parent2Id: true, marie: true, divorce: true } }),
    recherche,
  ]);
  const nombre = personnes.length;

  if (nombre === 0)
    return (
      <>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Bonjour {membre.prenom}</h1>
          <p className="text-foreground/70">Bienvenue sur l&apos;arbre généalogique de la famille.</p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
          <p className="max-w-sm text-foreground/70">L&apos;arbre est encore vide. Commencez par ajouter une première personne.</p>
          <Link href="/personnes/nouvelle" className={boutonAjouter}>
            Ajouter une personne
          </Link>
        </div>
      </>
    );

  const enListe = parametres.vue === "liste";
  const demande = identifiantValide(typeof parametres.centre === "string" ? parametres.centre : "");
  const centreId = demande !== null && personnes.some((p) => p.id === demande) ? demande : centreParDefaut(personnes, membre);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Bonjour {membre.prenom}</h1>
          <p className="text-foreground/70">
            L&apos;arbre compte {nombre} personne{nombre > 1 ? "s" : ""}.
          </p>
        </div>
        <Link href="/personnes/nouvelle" className={boutonAjouter}>
          Ajouter une personne
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Affichage" className="flex w-fit gap-1 rounded-lg bg-white p-1 ring-1 ring-black/10">
          <Onglet href={`/?centre=${centreId}`} actif={!enListe}>
            Arbre
          </Onglet>
          <Onglet href="/?vue=liste" actif={enListe}>
            Liste
          </Onglet>
        </nav>
        {!enListe && <RechercheArbre personnes={personnes} />}
      </div>

      {enListe ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {personnes.map((p) => (
            <TuilePersonne key={p.id} personne={p} />
          ))}
        </div>
      ) : (
        <VueArbre personnes={personnes} familles={familles} centreId={centreId} />
      )}
    </>
  );
}

export default function Accueil({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu recherche={searchParams} />
      </Suspense>
    </main>
  );
}
