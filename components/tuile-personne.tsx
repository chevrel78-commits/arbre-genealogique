// Portrait (photo, ou initiales à défaut) et tuile cliquable d'une personne.
import Link from "next/link";
import { accordNe, anneesDeVie, CIVILITES, type CodeCivilite } from "@/lib/personnes";

export type PersonneTuile = {
  id: number;
  civilite: CodeCivilite;
  prenom: string;
  nom: string;
  nomJeuneFille: string | null;
  anneeNaissance: number | null;
  decede: boolean;
  anneeDeces: number | null;
  photo: string | null;
};

export function Portrait({
  prenom,
  nom,
  photo = null,
  grand = false,
  petit = false,
}: {
  prenom: string;
  nom: string;
  photo?: string | null;
  grand?: boolean;
  petit?: boolean;
}) {
  const taille = grand ? "h-40 w-40 text-4xl" : petit ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl";
  if (photo)
    return (
      // Pas de next/image : la photo passe par une adresse réservée aux membres connectés.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/photos/${photo}${grand ? "" : "-v"}.webp`}
        alt={grand ? `Photo de ${prenom} ${nom}` : ""}
        loading={grand ? "eager" : "lazy"}
        decoding="async"
        className={`${taille} shrink-0 bg-arbre-doux object-cover ${grand ? "rounded-2xl" : "rounded-full"}`}
      />
    );
  const initiales = `${[...prenom][0] ?? ""}${[...nom][0] ?? ""}`.toUpperCase();
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-arbre-doux font-semibold text-arbre ${taille}`}>
      {initiales}
    </span>
  );
}

export function TuilePersonne({ personne: p }: { personne: PersonneTuile }) {
  return (
    <Link
      href={`/personnes/${p.id}`}
      className="flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-arbre/40 focus-visible:outline-2 focus-visible:outline-arbre"
    >
      <Portrait prenom={p.prenom} nom={p.nom} photo={p.photo} />
      <span className="w-full min-w-0">
        <span className="block text-xs text-foreground/60">{CIVILITES[p.civilite]}</span>
        <span className="block break-words font-medium">{p.prenom}</span>
        <span className="block break-words font-semibold">{p.nom}</span>
        {p.nomJeuneFille && (
          <span className="block break-words text-xs text-foreground/60">
            {accordNe(p.civilite)} {p.nomJeuneFille}
          </span>
        )}
        {anneesDeVie(p) && <span className="mt-1 block text-xs text-foreground/60">{anneesDeVie(p)}</span>}
      </span>
    </Link>
  );
}
