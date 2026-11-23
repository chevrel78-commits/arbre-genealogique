import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormulairePersonne } from "../../formulaire";
import { exigerMembre } from "@/lib/acces";
import { identifiantValide } from "@/lib/personnes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Modifier une fiche · Arbre généalogique" };

async function Contenu({ parametres }: { parametres: Promise<{ id: string }> }) {
  await exigerMembre();
  const id = identifiantValide((await parametres).id);
  if (id === null) notFound();
  const p = await prisma.personne.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <FormulairePersonne
      id={p.id}
      initiales={{
        civilite: p.civilite,
        prenom: p.prenom,
        nom: p.nom,
        nomJeuneFille: p.nomJeuneFille ?? "",
        jourNaissance: p.jourNaissance?.toString() ?? "",
        moisNaissance: p.moisNaissance?.toString() ?? "",
        anneeNaissance: p.anneeNaissance?.toString() ?? "",
        lieuNaissance: p.lieuNaissance ?? "",
        decede: p.decede ? "on" : "",
        jourDeces: p.jourDeces?.toString() ?? "",
        moisDeces: p.moisDeces?.toString() ?? "",
        anneeDeces: p.anneeDeces?.toString() ?? "",
        information: p.information ?? "",
      }}
    />
  );
}

export default function PageModifierPersonne({ params }: PageProps<"/personnes/[id]/modifier">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Modifier la fiche</h1>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu parametres={params} />
      </Suspense>
    </main>
  );
}
