"use client";
// Formulaire « mot de passe oublié » : envoie l'e-mail à l'action demanderNouveauMotDePasse.
import Link from "next/link";
import { useActionState } from "react";
import { demanderNouveauMotDePasse, type EtatOubli } from "../actions-publiques";
import { BoutonPrincipal, Champ, classeCarte, Erreur, Succes } from "@/components/formulaire";

export function FormulaireOubli() {
  const [etat, action, enCours] = useActionState<EtatOubli, FormData>(demanderNouveauMotDePasse, {});
  if (etat.envoye)
    return (
      <div className={classeCarte}>
        <Succes>
          <p className="font-medium">Demande enregistrée.</p>
          <p className="mt-1">
            Si cette adresse correspond à un compte, vous allez recevoir un e-mail avec un lien pour choisir un
            nouveau mot de passe. Le lien est valable 1 heure. Pensez à regarder dans les indésirables.
          </p>
        </Succes>
        <Link href="/connexion" className="text-center text-sm text-arbre underline">
          Retour à la page de connexion
        </Link>
      </div>
    );
  return (
    <form action={action} className={classeCarte}>
      <Champ libelle="E-mail" name="email" type="email" required autoComplete="email" defaultValue={etat.email} />
      <Erreur>{etat.erreur}</Erreur>
      <BoutonPrincipal enCours={enCours} texte="Recevoir un lien" texteEnCours="Envoi…" />
      <Link href="/connexion" className="text-center text-sm text-arbre underline">
        Retour à la page de connexion
      </Link>
    </form>
  );
}
