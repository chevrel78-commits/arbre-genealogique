"use client";
// Affichage de l'arbre : les traits en SVG, les tuiles par-dessus, le zoom, le défilement, le repli des
// branches et le masquage de la belle-famille. Les positions viennent de lib/disposition-arbre.ts.
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Portrait } from "@/components/tuile-personne";
import {
  calculerAffichage,
  disposer,
  TUILE,
  type FamilleArbre,
  type NoeudArbre,
  type PersonneArbre,
  type ReglagesAffichage,
} from "@/lib/disposition-arbre";
import { CIVILITES } from "@/lib/personnes";

const ZOOM_MIN = 0.15;
const ZOOM_MAX = 1.25;
const PAS_ZOOM = 0.25;

// Réglages d'affichage gardés dans ce navigateur : ils ne changent rien pour les autres membres.
const CLE_REGLAGES = "arbre_affichage_v1";
let memoire: string | null = null;
const abonnes = new Set<() => void>();

function lireReglages() {
  if (memoire === null) {
    try {
      memoire = localStorage.getItem(CLE_REGLAGES) ?? "";
    } catch {
      memoire = "";
    }
  }
  return memoire;
}

function ecrireReglages(reglages: ReglagesAffichage) {
  memoire = JSON.stringify(reglages);
  try {
    localStorage.setItem(CLE_REGLAGES, memoire);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage dure jusqu'au rechargement de la page.
  }
  abonnes.forEach((f) => f());
}

function abonner(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

function decoderReglages(texte: string): ReglagesAffichage {
  try {
    const v = JSON.parse(texte) as Partial<ReglagesAffichage>;
    return {
      replies: Array.isArray(v.replies) ? v.replies.filter((x) => Number.isInteger(x)) : [],
      sansBelleFamille: v.sansBelleFamille === true,
    };
  } catch {
    return { replies: [], sansBelleFamille: false };
  }
}

function TuileArbre({
  noeud,
  estCentre,
  nombreDescendants,
  replie,
  basculer,
}: {
  noeud: NoeudArbre;
  estCentre: boolean;
  nombreDescendants: number;
  replie: boolean;
  basculer: () => void;
}) {
  const p = noeud.personne;
  const nomComplet = `${p.prenom} ${p.nom}`;
  const texteRepli = `${replie ? "Déplier" : "Replier"} les ${nombreDescendants} descendant${nombreDescendants > 1 ? "s" : ""} de ${nomComplet}`;
  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-xl bg-white text-center shadow-sm ring-1 ${
        estCentre ? "ring-2 ring-arbre" : "ring-black/10"
      }`}
      style={{ left: noeud.x, top: noeud.y, width: TUILE.largeur, height: TUILE.hauteur }}
    >
      <Link
        href={`/personnes/${p.id}`}
        prefetch={false}
        title={`Ouvrir la fiche de ${nomComplet}`}
        className="flex min-h-0 flex-1 flex-col items-center gap-0.5 px-2 pt-2 hover:bg-arbre-doux/50"
      >
        <Portrait prenom={p.prenom} nom={p.nom} photo={p.photo} petit />
        <span className="w-full truncate text-sm font-medium leading-tight">
          <span className="text-xs font-normal text-foreground/60">{CIVILITES[p.civilite]} </span>
          {p.prenom}
        </span>
        <span className="w-full truncate text-sm font-semibold leading-tight">{p.nom}</span>
        {p.anneeNaissance !== null && <span className="text-xs leading-tight text-foreground/60">{p.anneeNaissance}</span>}
      </Link>
      <div className="flex border-t border-black/5 text-xs">
        {estCentre ? (
          <span className="flex-1 bg-arbre py-0.5 font-medium text-white">Au centre</span>
        ) : (
          <Link
            href={`/?centre=${p.id}`}
            prefetch={false}
            scroll={false}
            aria-label={`Centrer l'arbre sur ${nomComplet}`}
            className="flex-1 py-0.5 text-arbre hover:bg-arbre-doux"
          >
            Centrer
          </Link>
        )}
        {nombreDescendants > 0 && (
          <button
            type="button"
            onClick={basculer}
            aria-expanded={!replie}
            aria-label={texteRepli}
            title={texteRepli}
            className={`min-w-8 border-l border-black/10 px-1.5 py-0.5 font-semibold ${replie ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : "bg-white text-arbre hover:bg-arbre-doux"}`}
          >
            {replie ? `+${nombreDescendants}` : "−"}
          </button>
        )}
      </div>
    </div>
  );
}

export function VueArbre({ personnes, familles, centreId }: { personnes: PersonneArbre[]; familles: FamilleArbre[]; centreId: number }) {
  const [zoom, setZoom] = useState(1);
  const conteneur = useRef<HTMLDivElement>(null);
  // Quand on replie une branche, la tuile cliquée reste au même endroit de l'écran.
  const ancre = useRef<{ id: number; x: number; y: number } | null>(null);

  const texteReglages = useSyncExternalStore(abonner, lireReglages, () => "");
  const reglages = useMemo(() => decoderReglages(texteReglages), [texteReglages]);
  const affichage = useMemo(() => calculerAffichage(personnes, familles, centreId, reglages), [personnes, familles, centreId, reglages]);
  const disposition = useMemo(() => disposer(affichage.visibles, familles, centreId), [affichage, familles, centreId]);
  const { largeur, hauteur, noeuds, traits } = disposition;

  useLayoutEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;
    const a = ancre.current;
    ancre.current = null;
    const cible = noeuds.find((n) => n.personne.id === (a?.id ?? centreId));
    if (!cible) return;
    if (a) zone.scrollTo({ left: cible.x * zoom - a.x, top: cible.y * zoom - a.y });
    else
      zone.scrollTo({
        left: (cible.x + TUILE.largeur / 2) * zoom - zone.clientWidth / 2,
        top: (cible.y + TUILE.hauteur / 2) * zoom - zone.clientHeight / 2,
      });
  }, [noeuds, centreId, zoom]);

  const basculerBranche = (noeud: NoeudArbre) => {
    const zone = conteneur.current;
    if (zone) ancre.current = { id: noeud.personne.id, x: noeud.x * zoom - zone.scrollLeft, y: noeud.y * zoom - zone.scrollTop };
    const id = noeud.personne.id;
    ecrireReglages({
      ...reglages,
      replies: affichage.replies.has(id) ? reglages.replies.filter((x) => x !== id) : [...reglages.replies, id],
    });
  };

  const boutonZoom = "h-8 w-8 rounded-lg border border-black/15 bg-white text-lg leading-none hover:bg-black/5 disabled:opacity-40";
  const boutonOption = "h-8 rounded-lg border px-3 text-sm font-medium";
  const nombreMasques = affichage.nombreMasques;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={reglages.sansBelleFamille}
            onClick={() => ecrireReglages({ ...reglages, sansBelleFamille: !reglages.sansBelleFamille })}
            className={`${boutonOption} ${reglages.sansBelleFamille ? "border-arbre bg-arbre text-white hover:opacity-90" : "border-arbre bg-white text-arbre hover:bg-arbre-doux"}`}
          >
            {reglages.sansBelleFamille ? "Afficher la belle-famille" : "Masquer la belle-famille"}
          </button>
          {affichage.replies.size > 0 && (
            <button type="button" onClick={() => ecrireReglages({ ...reglages, replies: [] })} className={`${boutonOption} border-black/15 bg-white hover:bg-black/5`}>
              Tout déplier
            </button>
          )}
          {nombreMasques > 0 && (
            <span className="text-sm text-foreground/60" role="status">
              {nombreMasques} personne{nombreMasques > 1 ? "s" : ""} masquée{nombreMasques > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const zone = conteneur.current;
              if (!zone) return;
              const tout = Math.min(1, (zone.clientWidth - 8) / largeur, (zone.clientHeight - 8) / hauteur);
              setZoom(Math.max(ZOOM_MIN, Math.floor(tout * 100) / 100));
            }}
            className={`${boutonOption} border-arbre bg-white text-arbre hover:bg-arbre-doux`}
          >
            Tout voir
          </button>
          <button type="button" aria-label="Réduire l'arbre" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - PAS_ZOOM))} className={boutonZoom}>
            −
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-foreground/70" aria-live="polite">
            {Math.round(zoom * 100)} %
          </span>
          <button type="button" aria-label="Agrandir l'arbre" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + PAS_ZOOM))} className={boutonZoom}>
            +
          </button>
        </div>
      </div>

      <div ref={conteneur} className="h-[70vh] min-h-96 overflow-auto rounded-2xl bg-background ring-1 ring-black/10">
        <div className="relative" style={{ width: largeur * zoom, height: hauteur * zoom, margin: "0 auto" }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: largeur, height: hauteur, transform: `scale(${zoom})` }}>
            <svg width={largeur} height={hauteur} className="absolute left-0 top-0 text-arbre/60" fill="none" aria-hidden="true">
              {traits.map((t) => (
                <path
                  key={t.cle}
                  d={t.d}
                  transform={t.decalage ? `translate(${t.decalage} 0)` : undefined}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray={t.pointille ? "5 4" : undefined}
                />
              ))}
            </svg>
            {noeuds.map((n) => (
              <TuileArbre
                key={n.personne.id}
                noeud={n}
                estCentre={n.personne.id === centreId}
                nombreDescendants={affichage.nombreDescendants.get(n.personne.id) ?? 0}
                replie={affichage.replies.has(n.personne.id)}
                basculer={() => basculerBranche(n)}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/60">
        Trait plein : couple marié et filiation. Deux petites barres : couple divorcé. Pointillés : couple non marié, ou frères et sœurs aux parents inconnus. Bouton − sur une tuile : replier ses descendants.
      </p>
    </div>
  );
}
