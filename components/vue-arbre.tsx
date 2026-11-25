"use client";
// Affichage de l'arbre : les traits en SVG, les tuiles par-dessus, le zoom, le plein écran, le déplacement
// à la souris, le repli des branches, la vue resserrée et le masquage de la belle-famille.
// Les positions viennent de lib/disposition-arbre.ts.
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as EvenementPointeur } from "react";
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
import { anneesDeVie, CIVILITES } from "@/lib/personnes";

const ZOOM_MIN = 0.15;
const ZOOM_MAX = 1.25;
const PAS_ZOOM = 0.25;
// En dessous de cette distance (en pixels), le geste reste un simple clic sur la tuile.
const SEUIL_DEPLACEMENT = 5;

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
      procheSeulement: v.procheSeulement === true,
    };
  } catch {
    return { replies: [], sansBelleFamille: false, procheSeulement: false };
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
  // Dans l'arbre, une personne apparaît sous son nom de naissance (le nom de jeune fille s'il existe), en majuscules.
  const nomAffiche = (p.nomJeuneFille?.trim() || p.nom).toLocaleUpperCase("fr-FR");
  const nomComplet = `${p.prenom} ${nomAffiche}`;
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
        draggable={false}
        className="flex min-h-0 flex-1 cursor-grab flex-col items-center gap-0.5 px-2 pt-2 hover:bg-arbre-doux/50"
      >
        <Portrait prenom={p.prenom} nom={nomAffiche}photo={p.photo} petit />
        <span className="w-full truncate text-sm font-medium leading-tight">
          <span className="text-xs font-normal text-foreground/60">{CIVILITES[p.civilite]} </span>
          {p.prenom}
        </span>
        <span className="w-full truncate text-sm font-semibold leading-tight">{nomAffiche}</span>
        {anneesDeVie(p) && <span className="text-xs leading-tight text-foreground/60">{anneesDeVie(p)}</span>}
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
  const cadre = useRef<HTMLDivElement>(null);
  // Plein écran du navigateur, ou à défaut (certains téléphones) toute la fenêtre.
  const [pleinEcranNatif, setPleinEcranNatif] = useState(false);
  const [pleineFenetre, setPleineFenetre] = useState(false);
  const pleinEcran = pleinEcranNatif || pleineFenetre;
  const [enDeplacement, setEnDeplacement] = useState(false);
  const glisse = useRef<{ pointeur: number; x: number; y: number; gauche: number; haut: number; actif: boolean } | null>(null);
  const ignorerClic = useRef(false);
  // Quand on replie une branche, la tuile cliquée reste au même endroit de l'écran.
  const ancre = useRef<{ id: number; x: number; y: number } | null>(null);
  // Pincement à deux doigts : le point de l'arbre placé entre les doigts reste sous les doigts.
  const plan = useRef<HTMLDivElement>(null);
  const zoomActuel = useRef(zoom);
  useLayoutEffect(() => {
    zoomActuel.current = zoom;
  }, [zoom]);
  const ancreZoom = useRef<{ x: number; y: number; ecranX: number; ecranY: number } | null>(null);

  const texteReglages = useSyncExternalStore(abonner, lireReglages, () => "");
  const reglages = useMemo(() => decoderReglages(texteReglages), [texteReglages]);
  const affichage = useMemo(() => calculerAffichage(personnes, familles, centreId, reglages), [personnes, familles, centreId, reglages]);
  const disposition = useMemo(() => disposer(affichage.visibles, familles, centreId), [affichage, familles, centreId]);
  const { largeur, hauteur, noeuds, traits } = disposition;

  useLayoutEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;
    const az = ancreZoom.current;
    ancreZoom.current = null;
    if (az && plan.current) {
      const bord = plan.current.getBoundingClientRect();
      zone.scrollLeft += bord.left + az.x * zoom - az.ecranX;
      zone.scrollTop += bord.top + az.y * zoom - az.ecranY;
      return;
    }
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
  }, [noeuds, centreId, zoom, pleinEcran]);

  useEffect(() => {
    const suivre = () => {
      const actif = document.fullscreenElement === cadre.current;
      setPleinEcranNatif(actif);
      if (actif) setPleineFenetre(false);
    };
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  // Pincer et écarter deux doigts (téléphone, tablette) : réduire ou agrandir l'arbre.
  // Un doigt seul garde le défilement normal du navigateur.
  useEffect(() => {
    const zone = conteneur.current;
    if (!zone) return;
    let depart: { distance: number; zoom: number; x: number; y: number } | null = null;
    const mesure = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), ecranX: (a.clientX + b.clientX) / 2, ecranY: (a.clientY + b.clientY) / 2 };
    };
    const debut = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !plan.current) return;
      const m = mesure(e);
      const bord = plan.current.getBoundingClientRect();
      const z = zoomActuel.current;
      depart = { distance: Math.max(m.distance, 1), zoom: z, x: (m.ecranX - bord.left) / z, y: (m.ecranY - bord.top) / z };
    };
    const suite = (e: TouchEvent) => {
      if (!depart || e.touches.length !== 2) return;
      e.preventDefault(); // ni défilement ni zoom de toute la page pendant le pincement
      const m = mesure(e);
      const nouveau = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (depart.zoom * m.distance) / depart.distance));
      if (nouveau === zoomActuel.current) return;
      ancreZoom.current = { x: depart.x, y: depart.y, ecranX: m.ecranX, ecranY: m.ecranY };
      setZoom(nouveau);
    };
    const fin = (e: TouchEvent) => {
      if (e.touches.length < 2) depart = null;
    };
    // Safari (iPhone, iPad) zoome toute la page avec ses propres événements « gesture » : on les bloque ici.
    const bloquer = (e: Event) => e.preventDefault();
    zone.addEventListener("touchstart", debut, { passive: true });
    zone.addEventListener("touchmove", suite, { passive: false });
    zone.addEventListener("touchend", fin);
    zone.addEventListener("touchcancel", fin);
    zone.addEventListener("gesturestart", bloquer);
    zone.addEventListener("gesturechange", bloquer);
    return () => {
      zone.removeEventListener("touchstart", debut);
      zone.removeEventListener("touchmove", suite);
      zone.removeEventListener("touchend", fin);
      zone.removeEventListener("touchcancel", fin);
      zone.removeEventListener("gesturestart", bloquer);
      zone.removeEventListener("gesturechange", bloquer);
    };
  }, []);

  // Le mode « toute la fenêtre » n'a pas la sortie par Échap du navigateur : on la lui donne.
  useEffect(() => {
    if (!pleineFenetre) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPleineFenetre(false);
    };
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = debordement;
      document.removeEventListener("keydown", touche);
    };
  }, [pleineFenetre]);

  const basculerPleinEcran = async () => {
    if (pleineFenetre) return setPleineFenetre(false);
    if (document.fullscreenElement) return void (await document.exitFullscreen());
    // Selon l'appareil, la demande est refusée, absente ou reste sans réponse : on remplit alors la fenêtre.
    const demande = cadre.current!.requestFullscreen?.().catch(() => undefined);
    await Promise.race([demande, new Promise((fin) => setTimeout(fin, 400))]);
    if (document.fullscreenElement !== cadre.current) setPleineFenetre(true);
  };

  // Déplacement à la souris. Au doigt, le navigateur fait déjà défiler la zone.
  const debutGlisse = (e: EvenementPointeur<HTMLDivElement>) => {
    ignorerClic.current = false;
    const zone = conteneur.current;
    if (!zone || e.pointerType !== "mouse" || e.button !== 0) return;
    const bord = zone.getBoundingClientRect();
    // Un clic sur les barres de défilement garde son comportement normal.
    if (e.clientX - bord.left >= zone.clientWidth || e.clientY - bord.top >= zone.clientHeight) return;
    glisse.current = { pointeur: e.pointerId, x: e.clientX, y: e.clientY, gauche: zone.scrollLeft, haut: zone.scrollTop, actif: false };
  };

  const finGlisse = () => {
    glisse.current = null;
    setEnDeplacement(false);
  };

  const suiteGlisse = (e: EvenementPointeur<HTMLDivElement>) => {
    const g = glisse.current;
    const zone = conteneur.current;
    if (!g || !zone || e.pointerId !== g.pointeur) return;
    if (e.buttons === 0) return finGlisse();
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.actif) {
      if (Math.hypot(dx, dy) < SEUIL_DEPLACEMENT) return;
      g.actif = true;
      ignorerClic.current = true;
      zone.setPointerCapture(e.pointerId);
      setEnDeplacement(true);
    }
    zone.scrollLeft = g.gauche - dx;
    zone.scrollTop = g.haut - dy;
  };

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
    <div ref={cadre} className={`flex flex-col gap-2 ${pleinEcran ? "fixed inset-0 z-50 h-dvh bg-background p-3" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={reglages.procheSeulement}
            onClick={() => ecrireReglages({ ...reglages, procheSeulement: !reglages.procheSeulement })}
            className={`${boutonOption} ${reglages.procheSeulement ? "border-arbre bg-arbre text-white hover:opacity-90" : "border-arbre bg-white text-arbre hover:bg-arbre-doux"}`}
          >
            {reglages.procheSeulement ? "Arbre complet" : "Parents et enfants"}
          </button>
          {!reglages.procheSeulement && (
            <button
              type="button"
              aria-pressed={reglages.sansBelleFamille}
              onClick={() => ecrireReglages({ ...reglages, sansBelleFamille: !reglages.sansBelleFamille })}
              className={`${boutonOption} ${reglages.sansBelleFamille ? "border-arbre bg-arbre text-white hover:opacity-90" : "border-arbre bg-white text-arbre hover:bg-arbre-doux"}`}
            >
              {reglages.sansBelleFamille ? "Afficher la belle-famille" : "Masquer la belle-famille"}
            </button>
          )}
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
          <button type="button" onClick={basculerPleinEcran} className={`${boutonOption} border-arbre bg-white text-arbre hover:bg-arbre-doux`}>
            {pleinEcran ? "Quitter" : "Plein écran"}
          </button>
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

      <div
        ref={conteneur}
        onPointerDown={debutGlisse}
        onPointerMove={suiteGlisse}
        onPointerUp={finGlisse}
        onPointerCancel={finGlisse}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // Fin d'un déplacement : le relâchement ne doit pas ouvrir la fiche survolée.
          if (!ignorerClic.current) return;
          ignorerClic.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`${pleinEcran ? "min-h-0 flex-1" : "h-[70vh] min-h-96"} touch-pan-x touch-pan-y select-none overflow-auto rounded-2xl bg-background ring-1 ring-black/10 ${enDeplacement ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div ref={plan} className="relative" style={{ width: largeur * zoom, height: hauteur * zoom, margin: "0 auto" }}>
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
                nombreDescendants={reglages.procheSeulement ? 0 : (affichage.nombreDescendants.get(n.personne.id) ?? 0)}
                replie={affichage.replies.has(n.personne.id)}
                basculer={() => basculerBranche(n)}
              />
            ))}
          </div>
        </div>
      </div>
      {!pleinEcran && (
        <p className="text-xs text-foreground/60">
          Maintenir le clic et glisser : déplacer l&apos;arbre. Sur téléphone ou tablette, pincer ou écarter deux doigts : réduire ou agrandir. Trait plein : couple marié et filiation. Deux petites barres : couple divorcé. Pointillés : couple non marié, ou frères et sœurs aux parents inconnus. Bouton − sur une tuile : replier ses descendants.
        </p>
      )}
    </div>
  );
}
