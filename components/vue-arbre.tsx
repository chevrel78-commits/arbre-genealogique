"use client";
// Affichage de l'arbre : les traits en SVG, les tuiles par-dessus, le zoom et le défilement.
// Les positions viennent de lib/disposition-arbre.ts.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Portrait } from "@/components/tuile-personne";
import { TUILE, type DispositionArbre, type NoeudArbre } from "@/lib/disposition-arbre";
import { CIVILITES } from "@/lib/personnes";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.25;
const PAS_ZOOM = 0.25;

function TuileArbre({ noeud, estCentre }: { noeud: NoeudArbre; estCentre: boolean }) {
  const p = noeud.personne;
  const nomComplet = `${p.prenom} ${p.nom}`;
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
      {estCentre ? (
        <span className="bg-arbre py-0.5 text-xs font-medium text-white">Au centre</span>
      ) : (
        <Link
          href={`/?centre=${p.id}`}
          prefetch={false}
          scroll={false}
          aria-label={`Centrer l'arbre sur ${nomComplet}`}
          className="border-t border-black/5 py-0.5 text-xs text-arbre hover:bg-arbre-doux"
        >
          Centrer
        </Link>
      )}
    </div>
  );
}

export function VueArbre({ disposition, centreId }: { disposition: DispositionArbre; centreId: number }) {
  const [zoom, setZoom] = useState(1);
  const conteneur = useRef<HTMLDivElement>(null);
  const { largeur, hauteur, noeuds, traits } = disposition;

  // À chaque recentrage ou zoom, on ramène la personne centrale au milieu de la zone visible.
  useEffect(() => {
    const zone = conteneur.current;
    const centre = noeuds.find((n) => n.personne.id === centreId);
    if (!zone || !centre) return;
    zone.scrollTo({
      left: (centre.x + TUILE.largeur / 2) * zoom - zone.clientWidth / 2,
      top: (centre.y + TUILE.hauteur / 2) * zoom - zone.clientHeight / 2,
    });
  }, [noeuds, centreId, zoom]);

  const boutonZoom = "h-8 w-8 rounded-lg border border-black/15 bg-white text-lg leading-none hover:bg-black/5 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
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

      <div ref={conteneur} className="h-[70vh] min-h-96 overflow-auto rounded-2xl bg-background ring-1 ring-black/10">
        <div className="relative" style={{ width: largeur * zoom, height: hauteur * zoom, margin: "0 auto" }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: largeur, height: hauteur, transform: `scale(${zoom})` }}>
            <svg width={largeur} height={hauteur} className="absolute left-0 top-0 text-arbre/60" fill="none" aria-hidden="true">
              {traits.map((t) => (
                <path key={t.cle} d={t.d} stroke="currentColor" strokeWidth={1.5} strokeDasharray={t.pointille ? "5 4" : undefined} />
              ))}
            </svg>
            {noeuds.map((n) => (
              <TuileArbre key={n.personne.id} noeud={n} estCentre={n.personne.id === centreId} />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/60">Trait plein : couple marié et filiation. Pointillés : couple non marié, ou frères et sœurs aux parents inconnus.</p>
    </div>
  );
}
