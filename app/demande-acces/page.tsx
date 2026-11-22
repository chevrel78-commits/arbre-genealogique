import type { Metadata } from "next";
import { PagePublique } from "@/components/formulaire";
import { FormulaireDemande } from "./formulaire";

export const metadata: Metadata = { title: "Demander un accès · Arbre généalogique" };

// Page publique : un visiteur demande un compte, qui reste « en attente » jusqu'à la décision d'un administrateur.
export default function PageDemandeAcces() {
  return (
    <PagePublique titre="Demander un accès" sousTitre="Le site est réservé à la famille : un administrateur validera votre demande.">
      <FormulaireDemande />
    </PagePublique>
  );
}
