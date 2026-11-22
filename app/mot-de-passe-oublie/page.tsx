import type { Metadata } from "next";
import { PagePublique } from "@/components/formulaire";
import { FormulaireOubli } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié · Arbre généalogique" };

export default function PageMotDePasseOublie() {
  return (
    <PagePublique titre="Mot de passe oublié" sousTitre="Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.">
      <FormulaireOubli />
    </PagePublique>
  );
}
