import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_INFO, MESSAGES } from "./messages";
import { exigerAdministrateur, type MembreConnecte } from "@/lib/acces";
import {
  accepterDemande,
  basculerAdministrateur,
  desactiverMembre,
  reactiverMembre,
  refuserDemande,
} from "./actions";

export const metadata: Metadata = { title: "Administration · Arbre généalogique" };


const dateCourte = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

const bouton = "rounded-lg border px-3 py-1 text-sm hover:bg-black/5";

// Petit formulaire d'un seul bouton, qui envoie l'identifiant du membre à une action.
function BoutonAction({ id, action, texte, classe }: { id: number; action: (d: FormData) => Promise<void>; texte: string; classe: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${bouton} ${classe}`}>
        {texte}
      </button>
    </form>
  );
}

const STATUTS = {
  ACCEPTE: { texte: "Actif", classe: "bg-arbre-doux text-arbre" },
  DESACTIVE: { texte: "Désactivé", classe: "bg-black/5 text-foreground/60" },
  REFUSE: { texte: "Refusé", classe: "bg-red-50 text-red-700" },
  EN_ATTENTE: { texte: "En attente", classe: "bg-amber-50 text-amber-800" },
};

async function Contenu() {
  // Protection : réservé aux administrateurs (les autres membres sont renvoyés à l'accueil).
  const moi: MembreConnecte = await exigerAdministrateur();
  const info = (await cookies()).get(COOKIE_INFO)?.value;
  const message = info ? MESSAGES[info] : undefined;

  const [demandes, membres] = await Promise.all([
    prisma.membre.findMany({ where: { statut: "EN_ATTENTE" }, orderBy: { creeLe: "asc" } }),
    prisma.membre.findMany({
      where: { statut: { not: "EN_ATTENTE" } },
      orderBy: [{ statut: "asc" }, { nom: "asc" }, { prenom: "asc" }],
      include: { validePar: { select: { prenom: true, nom: true } } },
    }),
  ]);
  // Mêmes règles que dans actions.ts : seulement pour afficher les bons boutons.
  const gerable = (m: { id: number; admin: boolean; superAdmin: boolean }) =>
    !m.superAdmin && m.id !== moi.id && (!m.admin || moi.superAdmin);

  return (
    <>
      {message && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm ${message.erreur ? "bg-red-50 text-red-700" : "bg-arbre-doux text-arbre"}`}>
          {message.texte}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Demandes en attente ({demandes.length})</h2>
        {demandes.length === 0 && <p className="text-foreground/60">Aucune demande en attente.</p>}
        {demandes.map((d) => (
          <article key={d.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">
                {d.prenom} {d.nom}
              </p>
              <p className="break-all text-sm text-foreground/70">{d.email}</p>
              <p className="text-xs text-foreground/50">Demande du {dateCourte(d.creeLe)}</p>
              {d.messageDemande && <p className="mt-2 whitespace-pre-line rounded-lg bg-background px-3 py-2 text-sm">« {d.messageDemande} »</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <BoutonAction id={d.id} action={accepterDemande} texte="Accepter" classe="border-arbre bg-arbre text-white hover:bg-arbre hover:opacity-90" />
              <BoutonAction id={d.id} action={refuserDemande} texte="Refuser" classe="border-red-300 text-red-700" />
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Membres ({membres.length})</h2>
        <ul className="divide-y divide-black/5 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {membres.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {m.prenom} {m.nom}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUTS[m.statut].classe}`}>{STATUTS[m.statut].texte}</span>
                  {m.superAdmin ? (
                    <span className="rounded-full bg-arbre px-2 py-0.5 text-xs font-medium text-white">Super-administrateur</span>
                  ) : m.admin ? (
                    <span className="rounded-full bg-arbre-doux px-2 py-0.5 text-xs font-medium text-arbre">Administrateur</span>
                  ) : null}
                </p>
                <p className="break-all text-sm text-foreground/70">{m.email}</p>
                {m.validePar && m.valideLe && (
                  <p className="text-xs text-foreground/50">
                    {m.statut === "REFUSE" ? "Refusé" : "Accepté"} par {m.validePar.prenom} {m.validePar.nom} le {dateCourte(m.valideLe)}
                  </p>
                )}
              </div>
              {gerable(m) && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {m.statut === "ACCEPTE" && moi.superAdmin && (
                    <BoutonAction
                      id={m.id}
                      action={basculerAdministrateur}
                      texte={m.admin ? "Retirer administrateur" : "Nommer administrateur"}
                      classe="border-black/15"
                    />
                  )}
                  {m.statut === "ACCEPTE" && <BoutonAction id={m.id} action={desactiverMembre} texte="Désactiver" classe="border-red-300 text-red-700" />}
                  {m.statut === "DESACTIVE" && <BoutonAction id={m.id} action={reactiverMembre} texte="Réactiver" classe="border-black/15" />}
                  {m.statut === "REFUSE" && <BoutonAction id={m.id} action={accepterDemande} texte="Accepter finalement" classe="border-black/15" />}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function PageAdministration() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold">Administration</h1>
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
