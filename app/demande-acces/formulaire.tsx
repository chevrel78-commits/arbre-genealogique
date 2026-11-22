"use client";
// Formulaire de demande d'accès : envoie les champs à l'action demanderAcces (sur le serveur).
import Link from "next/link";
import { useActionState } from "react";
import { demanderAcces, type EtatDemande } from "../actions-publiques";
import { BoutonPrincipal, Champ, classeCarte, classeChamp, Erreur, Succes } from "@/components/formulaire";
import { LONGUEUR_MINIMALE } from "@/lib/longueurs";

export function FormulaireDemande() {
  const [etat, action, enCours] = useActionState<EtatDemande, FormData>(demanderAcces, {});
  if (etat.envoyee)
    return (
      <div className={classeCarte}>
        <Succes>
          <p className="font-medium">Votre demande est envoyée.</p>
          <p className="mt-1">
            Un administrateur va l&apos;examiner. Vous recevrez un e-mail dès qu&apos;elle sera acceptée.
          </p>
        </Succes>
        <Link href="/connexion" className="text-center text-sm text-arbre underline">
          Retour à la page de connexion
        </Link>
      </div>
    );
  const v = etat.valeurs;
  return (
    <form action={action} className={classeCarte}>
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Prénom" name="prenom" required maxLength={100} autoComplete="given-name" defaultValue={v?.prenom} />
        <Champ libelle="Nom" name="nom" required maxLength={100} autoComplete="family-name" defaultValue={v?.nom} />
      </div>
      <Champ libelle="E-mail" name="email" type="email" required autoComplete="email" defaultValue={v?.email} />
      <Champ
        libelle="Mot de passe"
        name="motDePasse"
        type="password"
        required
        minLength={LONGUEUR_MINIMALE}
        autoComplete="new-password"
        aide={`Au moins ${LONGUEUR_MINIMALE} caractères.`}
      />
      <Champ libelle="Retapez le mot de passe" name="confirmation" type="password" required autoComplete="new-password" />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Message (facultatif)
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          defaultValue={v?.message}
          placeholder="Par exemple : je suis le petit-fils de Jean et Marie Dupont."
          className={classeChamp}
        />
        <span className="text-xs font-normal text-foreground/60">Il aide les administrateurs à vous reconnaître.</span>
      </label>
      <Erreur>{etat.erreur}</Erreur>
      <BoutonPrincipal enCours={enCours} texte="Envoyer ma demande" texteEnCours="Envoi…" />
      <Link href="/connexion" className="text-center text-sm text-arbre underline">
        J&apos;ai déjà un compte : me connecter
      </Link>
    </form>
  );
}
