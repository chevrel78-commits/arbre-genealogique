"use client";
// Formulaire de connexion : il envoie e-mail et mot de passe à l'action seConnecter (sur le serveur)
// et affiche son message d'erreur éventuel.
import { useActionState } from "react";
import { seConnecter, type EtatConnexion } from "../actions-session";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(seConnecter, {});
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={etat.email}
          className="rounded-lg border border-black/15 px-3 py-2 text-base font-normal outline-arbre"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mot de passe
        <input
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-black/15 px-3 py-2 text-base font-normal outline-arbre"
        />
      </label>
      {etat.erreur && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="rounded-lg bg-arbre px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
