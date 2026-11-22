import type { Metadata } from "next";
import Link from "next/link";
import { PagePublique } from "@/components/formulaire";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Se connecter · Arbre généalogique" };

// Page de connexion, visible sans être connecté (comme la demande d'accès et le mot de passe oublié).
export default function PageConnexion() {
  return (
    <PagePublique titre="Arbre généalogique" sousTitre="Site privé de la famille : connectez-vous pour entrer.">
      <FormulaireConnexion />
      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/mot-de-passe-oublie" className="text-arbre underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-foreground/70">
          Pas encore de compte ?{" "}
          <Link href="/demande-acces" className="font-medium text-arbre underline">
            Demander un accès
          </Link>
        </p>
      </div>
    </PagePublique>
  );
}
