// Portrait et tuile cliquable d'une personne. La vraie photo remplacera les initiales à l'étape 6.
import Link from "next/link";
import { accordNe, CIVILITES, type CodeCivilite } from "@/lib/personnes";

export type PersonneTuile = {
  id: number;
  civilite: CodeCivilite;
  prenom: string;
  nom: string;
  nomJeuneFille: string | null;
  anneeNaissance: number | null;
};

export function Portrait({ prenom, nom, grand = false, petit = false }: { prenom: string; nom: string; grand?: boolean; petit?: boolean }) {
  const initiales = `${[...prenom][0] ?? ""}${[...nom][0] ?? ""}`.toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-arbre-doux font-semibold text-arbre ${
        grand ? "h-24 w-24 text-3xl" : petit ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl"
      }`}
    >
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
      <Portrait prenom={p.prenom} nom={p.nom} />
      <span className="w-full min-w-0">
        <span className="block text-xs text-foreground/60">{CIVILITES[p.civilite]}</span>
        <span className="block break-words font-medium">{p.prenom}</span>
        <span className="block break-words font-semibold">{p.nom}</span>
        {p.nomJeuneFille && (
          <span className="block break-words text-xs text-foreground/60">
            {accordNe(p.civilite)} {p.nomJeuneFille}
          </span>
        )}
        {p.anneeNaissance !== null && <span className="mt-1 block text-xs text-foreground/60">{p.anneeNaissance}</span>}
      </span>
    </Link>
  );
}
