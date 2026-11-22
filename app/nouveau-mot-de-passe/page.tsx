import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { classeCarte, PagePublique } from "@/components/formulaire";
import { jetonValable } from "@/lib/jetons";
import { FormulaireNouveauMotDePasse } from "./formulaire";

export const metadata: Metadata = { title: "Nouveau mot de passe · Arbre généalogique" };

// Vérifie le lien avant d'afficher le formulaire (lu à chaque visite, jamais à la construction du site).
async function Contenu({ searchParams }: { searchParams: PageProps<"/nouveau-mot-de-passe">["searchParams"] }) {
  await connection();
  const brut = (await searchParams).jeton;
  const jeton = typeof brut === "string" ? brut : "";
  if (!(await jetonValable(jeton)))
    return (
      <div className={classeCarte}>
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Ce lien n&apos;est plus valable : il a déjà servi ou il a plus d&apos;une heure.
        </p>
        <Link href="/mot-de-passe-oublie" className="text-center text-sm text-arbre underline">
          Recevoir un nouveau lien
        </Link>
      </div>
    );
  return <FormulaireNouveauMotDePasse jeton={jeton} />;
}

export default function PageNouveauMotDePasse({ searchParams }: PageProps<"/nouveau-mot-de-passe">) {
  return (
    <PagePublique titre="Nouveau mot de passe">
      <Suspense fallback={<p className="text-sm text-foreground/50">Vérification du lien…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </PagePublique>
  );
}
