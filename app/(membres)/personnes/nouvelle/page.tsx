import type { Metadata } from "next";
import { Suspense } from "react";
import { FormulairePersonne } from "../formulaire";
import { exigerMembre } from "@/lib/acces";

export const metadata: Metadata = { title: "Ajouter une personne · Arbre généalogique" };

async function Contenu() {
  await exigerMembre();
  return <FormulairePersonne />;
}

export default function PageNouvellePersonne() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Ajouter une personne</h1>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
