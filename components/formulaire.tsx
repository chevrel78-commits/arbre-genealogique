// Petits éléments communs aux formulaires du site (même apparence partout).
import type { ComponentProps, ReactNode } from "react";
import { LienSupport } from "./lien-support";

export const classeChamp = "rounded-lg border border-black/15 px-3 py-2 text-base font-normal outline-arbre";

export function Champ({ libelle, aide, ...props }: { libelle: string; aide?: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {libelle}
      <input className={classeChamp} {...props} />
      {aide && <span className="text-xs font-normal text-foreground/60">{aide}</span>}
    </label>
  );
}

export function Erreur({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function Succes({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-arbre-doux px-4 py-3 text-sm text-arbre">{children}</div>;
}

export function BoutonPrincipal({ enCours, texte, texteEnCours }: { enCours: boolean; texte: string; texteEnCours: string }) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="rounded-lg bg-arbre px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {enCours ? texteEnCours : texte}
    </button>
  );
}

export const classeCarte = "flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5";

// Mise en page des pages publiques (connexion, demande d'accès, mot de passe oublié).
export function PagePublique({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-arbre" aria-hidden="true">
        <circle cx="32" cy="24" r="18" fill="currentColor" opacity="0.85" />
        <rect x="29" y="34" width="6" height="22" rx="2" fill="#6b4a2b" />
      </svg>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{titre}</h1>
        {sousTitre && <p className="mt-1 max-w-sm text-foreground/70">{sousTitre}</p>}
      </div>
      {children}
      <p className="flex flex-col items-center gap-1 text-sm text-foreground/70">
        Un problème pour entrer sur le site ?
        <LienSupport />
      </p>
    </main>
  );
}
