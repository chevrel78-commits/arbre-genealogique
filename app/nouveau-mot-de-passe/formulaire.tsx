"use client";
// Formulaire « nouveau mot de passe » (ouvert depuis le lien reçu par e-mail).
import { useActionState } from "react";
import { changerMotDePasse, type EtatNouveauMotDePasse } from "../actions-publiques";
import { BoutonPrincipal, Champ, classeCarte, Erreur } from "@/components/formulaire";
import { LONGUEUR_MINIMALE } from "@/lib/longueurs";

export function FormulaireNouveauMotDePasse({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatNouveauMotDePasse, FormData>(changerMotDePasse, {});
  return (
    <form action={action} className={classeCarte}>
      <input type="hidden" name="jeton" value={jeton} />
      <Champ
        libelle="Nouveau mot de passe"
        name="motDePasse"
        type="password"
        required
        minLength={LONGUEUR_MINIMALE}
        autoComplete="new-password"
        aide={`Au moins ${LONGUEUR_MINIMALE} caractères.`}
      />
      <Champ libelle="Retapez le mot de passe" name="confirmation" type="password" required autoComplete="new-password" />
      <Erreur>{etat.erreur}</Erreur>
      <BoutonPrincipal enCours={enCours} texte="Enregistrer et me connecter" texteEnCours="Enregistrement…" />
    </form>
  );
}
