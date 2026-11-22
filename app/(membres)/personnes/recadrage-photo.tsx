"use client";
// Fenêtre de recadrage : on déplace la photo dans un cadre carré et un curseur l'agrandit.
// Rien n'est modifié ici : on envoie au serveur la zone choisie, et c'est lui qui découpe l'image.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const CADRE = 256;
const ZOOM_MAX = 4;

export type ZoneRecadrage = { x: number; y: number; cote: number };

export function RecadragePhoto({
  url,
  onValider,
  onAnnuler,
  onErreur,
}: {
  url: string;
  onValider: (zone: ZoneRecadrage) => void;
  onAnnuler: () => void;
  onErreur: () => void;
}) {
  const [dimensions, setDimensions] = useState<{ l: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const glissement = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // À zoom 1, le petit côté de la photo remplit exactement le cadre.
  const echelleDe = (z: number, d = dimensions) => (d ? (CADRE / Math.min(d.l, d.h)) * z : 1);
  const borner = (p: { x: number; y: number }, z: number, d = dimensions) => {
    if (!d) return p;
    const e = echelleDe(z, d);
    return {
      x: Math.min(0, Math.max(CADRE - d.l * e, p.x)),
      y: Math.min(0, Math.max(CADRE - d.h * e, p.y)),
    };
  };

  const changerZoom = (nouveau: number) => {
    // Le point au milieu du cadre reste au milieu pendant le zoom.
    const ancienne = echelleDe(zoom);
    const nouvelle = echelleDe(nouveau);
    const cx = (CADRE / 2 - position.x) / ancienne;
    const cy = (CADRE / 2 - position.y) / ancienne;
    setZoom(nouveau);
    setPosition(borner({ x: CADRE / 2 - cx * nouvelle, y: CADRE / 2 - cy * nouvelle }, nouveau));
  };

  const debut = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    glissement.current = { px: e.clientX, py: e.clientY, x: position.x, y: position.y };
  };
  const deplacer = (e: PointerEvent<HTMLDivElement>) => {
    const g = glissement.current;
    if (g) setPosition(borner({ x: g.x + e.clientX - g.px, y: g.y + e.clientY - g.py }, zoom));
  };
  const fin = () => {
    glissement.current = null;
  };
  const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const pas = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
    if (!pas) return;
    e.preventDefault();
    setPosition((p) => borner({ x: p.x + pas[0], y: p.y + pas[1] }, zoom));
  };

  const valider = () => {
    if (!dimensions) return;
    const e = echelleDe(zoom);
    onValider({
      x: Math.max(0, -position.x / e / dimensions.l),
      y: Math.max(0, -position.y / e / dimensions.h),
      cote: Math.min(1, CADRE / e / dimensions.l),
    });
  };

  const e = echelleDe(zoom);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer la photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(ev) => {
        if (ev.key === "Escape") onAnnuler();
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold">Recadrer la photo</h2>
          <p className="text-sm text-foreground/70">Faites glisser la photo et utilisez le curseur pour l&apos;agrandir.</p>
        </div>

        <div
          tabIndex={0}
          role="application"
          aria-label="Zone de recadrage : flèches du clavier pour déplacer la photo"
          onPointerDown={debut}
          onPointerMove={deplacer}
          onPointerUp={fin}
          onPointerCancel={fin}
          onKeyDown={clavier}
          className="relative mx-auto cursor-move touch-none select-none overflow-hidden rounded-lg bg-black/10 outline-offset-2 outline-arbre focus-visible:outline-2"
          style={{ width: CADRE, height: CADRE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Photo à recadrer"
            draggable={false}
            onError={onErreur}
            onLoad={(ev) => {
              const d = { l: ev.currentTarget.naturalWidth, h: ev.currentTarget.naturalHeight };
              if (d.l === 0 || d.h === 0) return onErreur();
              const depart = echelleDe(1, d);
              setDimensions(d);
              setPosition({ x: (CADRE - d.l * depart) / 2, y: (CADRE - d.h * depart) / 2 });
            }}
            className="absolute"
            style={
              dimensions
                ? { left: position.x, top: position.y, width: dimensions.l * e, height: dimensions.h * e, maxWidth: "none" }
                : { opacity: 0 }
            }
          />
          {/* Aperçu de la vignette ronde affichée dans l'arbre. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgba(0,0,0,0.3)]" />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          Zoom
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            disabled={!dimensions}
            onChange={(ev) => changerZoom(Number(ev.target.value))}
            className="min-w-0 flex-1 accent-arbre"
          />
          <span className="w-12 text-right tabular-nums text-foreground/70">{Math.round(zoom * 100)} %</span>
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onAnnuler} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
            Annuler
          </button>
          <button type="button" onClick={valider} disabled={!dimensions} className="rounded-lg bg-arbre px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
