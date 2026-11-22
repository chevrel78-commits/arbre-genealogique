import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Portrait } from "@/components/tuile-personne";
import { exigerMembre } from "@/lib/acces";
import { accordNe, CIVILITES, identifiantValide, phraseNaissance } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Fiche · Arbre généalogique" };

const dateCourte = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

async function Fiche({ parametres }: { parametres: Promise<{ id: string }> }) {
  // Protection d'abord : un visiteur sans compte ne doit rien apprendre, même pas si la fiche existe.
  await exigerMembre();
  const id = identifiantValide((await parametres).id);
  if (id === null) notFound();
  const p = await prisma.personne.findUnique({
    where: { id },
    include: {
      creePar: { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
    },
  });
  if (!p) notFound();

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Portrait prenom={p.prenom} nom={p.nom} grand />
        <div className="min-w-0">
          <p className="text-sm text-foreground/60">{CIVILITES[p.civilite]}</p>
          <h1 className="break-words text-2xl font-semibold">
            {p.prenom} {p.nom}
          </h1>
          {p.nomJeuneFille && (
            <p className="break-words text-foreground/70">
              {accordNe(p.civilite)} {p.nomJeuneFille}
            </p>
          )}
          <p className="break-words text-foreground/70">{phraseNaissance(p)}</p>
        </div>
      </div>

      <div>
        <Link href={`/personnes/${p.id}/modifier`} className="inline-block rounded-lg bg-arbre px-4 py-2 font-medium text-white hover:opacity-90">
          Modifier
        </Link>
      </div>

      <p className="border-t border-black/5 pt-4 text-xs text-foreground/50">
        Fiche ajoutée{p.creePar ? ` par ${p.creePar.prenom} ${p.creePar.nom}` : ""} le {dateCourte(p.creeLe)}
        {p.modifiePar && `, modifiée par ${p.modifiePar.prenom} ${p.modifiePar.nom} le ${dateCourte(p.modifieLe)}`}.
      </p>
    </article>
  );
}

export default function PageFiche({ params }: PageProps<"/personnes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-arbre underline">
        ← Retour à l&apos;arbre
      </Link>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Fiche parametres={params} />
      </Suspense>
    </main>
  );
}
