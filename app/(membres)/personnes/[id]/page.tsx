import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { FormulairePhoto } from "../formulaire-photo";
import { Galerie, type PhotoGalerie } from "../galerie";
import { retirerLien, supprimerPersonne } from "../liens-actions";
import { StatutCouple } from "../statut-couple";
import { BoutonConfirme } from "@/components/bouton-confirme";
import { Portrait, TuilePersonne, type PersonneTuile } from "@/components/tuile-personne";
import { exigerMembre } from "@/lib/acces";
import { chargerProches } from "@/lib/liens";
import { COOKIE_INFO_FICHE } from "@/lib/messages-fiche";
import { accordNe, CIVILITES, identifiantValide, LIENS, phraseDeces, phraseNaissance, type TypeLien } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Fiche · Arbre généalogique" };

const dateCourte = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

const nomDe = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`;

function BoutonAjouter({ id, lien }: { id: number; lien: TypeLien }) {
  return (
    <Link href={`/personnes/${id}/ajouter/${lien}`} className="rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux">
      + {LIENS[lien].libelle}
    </Link>
  );
}

function Rubrique({ titre, boutons, vide, children }: { titre: string; boutons?: ReactNode; vide: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{titre}</h2>
        {boutons && <div className="flex flex-wrap gap-2">{boutons}</div>}
      </div>
      {vide ? <p className="text-sm text-foreground/60">Personne pour l&apos;instant.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>}
    </section>
  );
}

// Tuile d'un proche, avec une précision (« Mariés », « Demi-sœur »…) et le bouton pour retirer le lien.
function Proche({
  personne,
  precision,
  complement,
  sourceId,
  sourceNom,
  type,
}: {
  personne: PersonneTuile;
  precision?: string;
  complement?: ReactNode;
  sourceId: number;
  sourceNom: string;
  type?: "parent" | "enfant" | "conjoint" | "frere";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <TuilePersonne personne={personne} />
      {complement}
      {precision && <p className="text-center text-xs text-foreground/60">{precision}</p>}
      {type && (
        <form action={retirerLien} className="text-center">
          <input type="hidden" name="source" value={sourceId} />
          <input type="hidden" name="cible" value={personne.id} />
          <input type="hidden" name="type" value={type} />
          <BoutonConfirme
            message={`Retirer le lien entre ${sourceNom} et ${nomDe(personne)} ? Les deux personnes resteront dans l'arbre.`}
            className="text-xs text-red-700 underline"
          >
            Retirer le lien
          </BoutonConfirme>
        </form>
      )}
    </div>
  );
}

async function Fiche({ parametres }: { parametres: Promise<{ id: string }> }) {
  // Protection d'abord : un visiteur sans compte ne doit rien apprendre, même pas si la fiche existe.
  const moi = await exigerMembre();
  const id = identifiantValide((await parametres).id);
  if (id === null) notFound();
  const [p, proches, photosBrutes] = await Promise.all([
    prisma.personne.findUnique({
      where: { id },
      include: {
        creePar: { select: { prenom: true, nom: true } },
        modifiePar: { select: { prenom: true, nom: true } },
      },
    }),
    chargerProches(id),
    prisma.photo.findMany({
      where: { identifications: { some: { personneId: id } } },
      orderBy: { id: "desc" },
      include: {
        ajouteePar: { select: { prenom: true, nom: true } },
        identifications: {
          orderBy: { id: "asc" },
          select: { x: true, y: true, personne: { select: { id: true, prenom: true, nom: true } } },
        },
      },
    }),
  ]);
  if (!p || !proches) notFound();
  const photos: PhotoGalerie[] = photosBrutes.map((f) => ({
    id: f.id,
    fichier: f.fichier,
    format: f.format,
    largeur: f.largeur,
    hauteur: f.hauteur,
    legende: f.legende,
    jourPrise: f.jourPrise,
    moisPrise: f.moisPrise,
    anneePrise: f.anneePrise,
    lieu: f.lieu,
    ajouteeParId: f.ajouteeParId,
    ajouteePar: f.ajouteePar ? nomDe(f.ajouteePar) : null,
    personnes: f.identifications.map((i) => ({ id: i.personne.id, nom: nomDe(i.personne), x: i.x, y: i.y })),
  }));

  const info = (await cookies()).get(COOKIE_INFO_FICHE)?.value;
  const erreurInfo = info?.startsWith("erreur:");
  const texteInfo = info?.slice(info.indexOf(":") + 1);

  const { parents, freres, demis, unions, enfants, parentsConnus } = proches;
  const aPere = parents.some((x) => x.civilite === "M");
  const aMere = parents.some((x) => x.civilite !== "M");
  const couples = unions.filter((u) => u.conjoint !== null);
  const plusieursUnions = unions.length > 1;
  const nbLiens = parents.length + couples.length + freres.length + enfants.length;
  const sourceNom = nomDe(p);

  return (
    <>
      {texteInfo && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm ${erreurInfo ? "bg-red-50 text-red-700" : "bg-arbre-doux text-arbre"}`}>
          {texteInfo}
        </p>
      )}

      <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Portrait prenom={p.prenom} nom={p.nom} photo={p.photo} grand />
          <div className="min-w-0">
            <p className="text-sm text-foreground/60">{CIVILITES[p.civilite]}</p>
            <h1 className="break-words text-2xl font-semibold">{sourceNom}</h1>
            {p.nomJeuneFille && (
              <p className="break-words text-foreground/70">
                {accordNe(p.civilite)} {p.nomJeuneFille}
              </p>
            )}
            <p className="break-words text-foreground/70">{phraseNaissance(p)}</p>
            {p.decede && <p className="break-words text-foreground/70">{phraseDeces(p)}</p>}
          </div>
        </div>

        {p.information && (
          <section className="rounded-lg bg-background px-4 py-3">
            <h2 className="mb-1 text-sm font-semibold">Information</h2>
            <p className="whitespace-pre-line break-words text-sm text-foreground/80">{p.information}</p>
          </section>
        )}

        <FormulairePhoto id={p.id} aUnePhoto={p.photo !== null} nom={sourceNom} />

        <div className="flex flex-wrap gap-2">
          <Link href={`/personnes/${p.id}/modifier`} className="inline-block rounded-lg bg-arbre px-4 py-2 font-medium text-white hover:opacity-90">
            Modifier
          </Link>
          <Link href={`/?centre=${p.id}`} prefetch={false} className="inline-block rounded-lg border border-arbre px-4 py-2 font-medium text-arbre hover:bg-arbre-doux">
            Voir dans l&apos;arbre
          </Link>
        </div>

        <p className="border-t border-black/5 pt-4 text-xs text-foreground/50">
          Fiche ajoutée{p.creePar ? ` par ${nomDe(p.creePar)}` : ""} le {dateCourte(p.creeLe)}
          {p.modifiePar && `, modifiée par ${nomDe(p.modifiePar)} le ${dateCourte(p.modifieLe)}`}.
        </p>
      </article>

      <Galerie personneId={p.id} photos={photos} moi={{ id: moi.id, admin: moi.admin }} />

      <Rubrique
        titre="Parents"
        vide={parents.length === 0}
        boutons={
          <>
            {!aPere && <BoutonAjouter id={id} lien="pere" />}
            {!aMere && <BoutonAjouter id={id} lien="mere" />}
          </>
        }
      >
        {parents.map((x) => (
          <Proche key={x.id} personne={x} sourceId={id} sourceNom={sourceNom} type="parent" />
        ))}
      </Rubrique>

      <Rubrique titre="Conjoints" vide={couples.length === 0} boutons={<BoutonAjouter id={id} lien="conjoint" />}>
        {couples.map((u) => (
          <Proche
            key={u.id}
            personne={u.conjoint!}
            complement={
              <StatutCouple
                sourceId={id}
                familleId={u.id}
                statut={u.divorce ? "divorce" : u.marie ? "marie" : "couple"}
                conjoint={nomDe(u.conjoint!)}
              />
            }
            precision={u.enfants.length > 0 ? `${u.enfants.length} enfant${u.enfants.length > 1 ? "s" : ""}` : undefined}
            sourceId={id}
            sourceNom={sourceNom}
            type={u.enfants.length === 0 ? "conjoint" : undefined}
          />
        ))}
      </Rubrique>

      <Rubrique
        titre="Frères et sœurs"
        vide={freres.length + demis.length === 0}
        boutons={
          <>
            <BoutonAjouter id={id} lien="frere" />
            <BoutonAjouter id={id} lien="soeur" />
          </>
        }
      >
        {freres.map((x) => (
          <Proche key={x.id} personne={x} sourceId={id} sourceNom={sourceNom} type={parentsConnus ? undefined : "frere"} />
        ))}
        {demis.map((x) => (
          <Proche key={x.id} personne={x} precision={x.civilite === "M" ? "Demi-frère" : "Demi-sœur"} sourceId={id} sourceNom={sourceNom} />
        ))}
      </Rubrique>

      <Rubrique titre="Enfants" vide={enfants.length === 0} boutons={<BoutonAjouter id={id} lien="enfant" />}>
        {enfants.map((x) => (
          <Proche
            key={x.id}
            personne={x}
            precision={plusieursUnions ? (x.autreParent ? `Avec ${nomDe(x.autreParent)}` : "Autre parent inconnu") : undefined}
            sourceId={id}
            sourceNom={sourceNom}
            type="enfant"
          />
        ))}
      </Rubrique>

      {moi.admin && (
        <form action={supprimerPersonne} className="border-t border-black/10 pt-4">
          <input type="hidden" name="id" value={id} />
          <BoutonConfirme
            message={`Supprimer définitivement ${sourceNom} ? ${nbLiens} lien${nbLiens > 1 ? "s" : ""} de famille ser${nbLiens > 1 ? "ont" : "a"} retiré${nbLiens > 1 ? "s" : ""}. Ses proches resteront dans l'arbre. Les photos et documents où elle est la seule personne identifiée seront effacés. Cette action est irréversible.`}
            className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
          >
            Supprimer cette personne
          </BoutonConfirme>
        </form>
      )}
    </>
  );
}

export default function PageFiche({ params }: PageProps<"/personnes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/" className="text-sm text-arbre underline">
        ← Retour à l&apos;arbre
      </Link>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Fiche parametres={params} />
      </Suspense>
    </main>
  );
}
