import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigerMembre } from "@/lib/acces";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Activité · Arbre généalogique" };

const TAILLE_FIL = 25;
const TAILLE_CONNEXIONS = 20;
// L'identification automatique de la personne de la fiche se fait en même temps que l'ajout de la photo.
const ECART_AJOUT_MS = 2000;

type Nom = { prenom: string; nom: string };
type Evenement = {
  cle: string;
  date: Date;
  type: "Personne" | "Photo" | "Identification";
  auteur: Nom | null;
  texte: string;
  personneId: number | null;
  vignette: string | null;
};

const nomComplet = (n: Nom) => `${n.prenom} ${n.nom}`;
const dateHeure = (d: Date) =>
  d.toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const COULEURS = {
  Personne: "bg-arbre-doux text-arbre",
  Photo: "bg-amber-50 text-amber-800",
  Identification: "bg-sky-50 text-sky-800",
};

// Le fil est calculé à partir des dates déjà en base : un élément supprimé en disparaît donc.
async function lireFil(): Promise<Evenement[]> {
  const auteur = { select: { prenom: true, nom: true } };
  const nomPersonne = { select: { id: true, prenom: true, nom: true } };
  const [personnes, photos, identifications] = await Promise.all([
    prisma.personne.findMany({
      orderBy: { creeLe: "desc" },
      take: TAILLE_FIL,
      select: { id: true, prenom: true, nom: true, creeLe: true, creePar: auteur },
    }),
    prisma.photo.findMany({
      orderBy: { creeLe: "desc" },
      take: TAILLE_FIL,
      select: {
        id: true,
        fichier: true,
        creeLe: true,
        ajouteePar: auteur,
        identifications: { orderBy: { id: "asc" }, select: { personne: nomPersonne } },
      },
    }),
    prisma.identificationPhoto.findMany({
      orderBy: { creeLe: "desc" },
      take: TAILLE_FIL * 2,
      select: {
        id: true,
        creeLe: true,
        ajouteeParId: true,
        ajouteePar: auteur,
        personne: nomPersonne,
        photo: { select: { fichier: true, creeLe: true, ajouteeParId: true } },
      },
    }),
  ]);

  const evenements: Evenement[] = [
    ...personnes.map((p): Evenement => ({
      cle: `personne-${p.id}`,
      date: p.creeLe,
      type: "Personne",
      auteur: p.creePar,
      texte: `${nomComplet(p)} ajouté(e) à l'arbre`,
      personneId: p.id,
      vignette: null,
    })),
    ...photos.map((p): Evenement => {
      const [premiere, ...autres] = p.identifications.map((i) => i.personne);
      const suite = autres.length > 0 ? ` et ${autres.length} autre${autres.length > 1 ? "s" : ""}` : "";
      return {
        cle: `photo-${p.id}`,
        date: p.creeLe,
        type: "Photo",
        auteur: p.ajouteePar,
        texte: premiere ? `Photo de ${nomComplet(premiere)}${suite}` : "Nouvelle photo",
        personneId: premiere?.id ?? null,
        vignette: p.fichier,
      };
    }),
    ...identifications
      .filter((i) => i.ajouteeParId !== i.photo.ajouteeParId || Math.abs(i.creeLe.getTime() - i.photo.creeLe.getTime()) > ECART_AJOUT_MS)
      .map((i): Evenement => ({
        cle: `identification-${i.id}`,
        date: i.creeLe,
        type: "Identification",
        auteur: i.ajouteePar,
        texte: `${nomComplet(i.personne)} identifié(e) sur une photo`,
        personneId: i.personne.id,
        vignette: i.photo.fichier,
      })),
  ];
  return evenements.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, TAILLE_FIL);
}

function Chiffre({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-4 py-3">
      <p className="text-2xl font-semibold text-arbre">{valeur}</p>
      <p className="text-sm text-foreground/70">{libelle}</p>
    </div>
  );
}

function LigneFil({ e }: { e: Evenement }) {
  const contenu = (
    <>
      {e.vignette ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/photos/${e.vignette}-v.webp`} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-lg bg-arbre-doux" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium break-words">{e.texte}</span>
        <span className="block text-xs text-foreground/60">
          {e.auteur ? `par ${nomComplet(e.auteur)}` : "auteur inconnu"} · {dateHeure(e.date)}
        </span>
      </span>
      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${COULEURS[e.type]}`}>{e.type}</span>
    </>
  );
  const classe = "flex items-center gap-3 px-3 py-2";
  return (
    <li>
      {e.personneId ? (
        <Link href={`/personnes/${e.personneId}`} prefetch={false} className={`${classe} hover:bg-black/5`}>
          {contenu}
        </Link>
      ) : (
        <div className={classe}>{contenu}</div>
      )}
    </li>
  );
}

async function Contenu() {
  const moi = await exigerMembre();
  const [nbPersonnes, nbPhotos, nbMembres, fil, connexions] = await Promise.all([
    prisma.personne.count(),
    prisma.photo.count(),
    prisma.membre.count({ where: { statut: "ACCEPTE" } }),
    lireFil(),
    // Les connexions ne sont lues que pour un administrateur : elles n'arrivent jamais au navigateur des autres.
    moi.admin
      ? prisma.connexionMembre.findMany({
          orderBy: { creeLe: "desc" },
          take: TAILLE_CONNEXIONS,
          select: { id: true, creeLe: true, membre: { select: { prenom: true, nom: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Chiffre valeur={nbPersonnes} libelle={nbPersonnes > 1 ? "personnes" : "personne"} />
        <Chiffre valeur={nbPhotos} libelle={nbPhotos > 1 ? "photos" : "photo"} />
        <Chiffre valeur={nbMembres} libelle={nbMembres > 1 ? "membres" : "membre"} />
      </div>

      <div className={`grid gap-6 ${connexions ? "lg:grid-cols-3" : ""}`}>
        <section className={`flex min-w-0 flex-col gap-3 ${connexions ? "lg:col-span-2" : ""}`}>
          <h2 className="text-xl font-semibold">Derniers ajouts</h2>
          {fil.length === 0 ? (
            <p className="text-foreground/60">Rien pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 bg-white">
              {fil.map((e) => (
                <LigneFil key={e.cle} e={e} />
              ))}
            </ul>
          )}
        </section>

        {connexions && (
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="text-xl font-semibold">Dernières connexions</h2>
            <p className="text-xs text-foreground/60">Visible seulement par les administrateurs. Historique gardé 6 mois.</p>
            {connexions.length === 0 ? (
              <p className="text-foreground/60">Aucune connexion notée pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
                {connexions.map((c) => (
                  <li key={c.id} className="px-3 py-2">
                    <span className="block font-medium break-words">{nomComplet(c.membre)}</span>
                    <span className="block text-xs text-foreground/60">{dateHeure(c.creeLe)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}

export default function PageActivite() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Activité</h1>
      <Suspense fallback={<p className="text-foreground/50">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
