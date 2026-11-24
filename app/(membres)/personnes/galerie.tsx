"use client";
// Galerie d'une fiche : ajout de photos (date et lieu lus dans le fichier) et de documents PDF (aperçu de la
// première page dessiné par pdf.js), vue en grand, identification.
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import {
  ajouterPhotoGalerie,
  identifierPersonne,
  lieuDepuisGps,
  listerPersonnesIdentifiables,
  modifierInfosPhoto,
  retirerIdentification,
  supprimerPhotoGalerie,
  type PersonneIdentifiable,
} from "./galerie-actions";
import { preparerImage } from "./formulaire-photo";
import { envoyerPhoto } from "./photo-actions";
import { RecadragePhoto, type ZoneRecadrage } from "./recadrage-photo";
import { classeChamp, Erreur } from "@/components/formulaire";
import { apercuPdf } from "@/lib/apercu-pdf";
import { MOIS, phrasePrise, TAILLE_PHOTO_MAX } from "@/lib/personnes";

export type PhotoGalerie = {
  id: number;
  fichier: string;
  format: "IMAGE" | "PDF";
  largeur: number;
  hauteur: number;
  legende: string | null;
  jourPrise: number | null;
  moisPrise: number | null;
  anneePrise: number | null;
  lieu: string | null;
  ajouteeParId: number | null;
  ajouteePar: string | null;
  personnes: { id: number; nom: string; x: number | null; y: number | null }[];
};

type Infos = { jour: string; mois: string; annee: string; lieu: string; legende: string };
// pdf : document PDF ; url sert de clé et, pour une image, d'aperçu (pour un PDF, l'aperçu est dessiné à part).
type Attente = { fichier: File; url: string; pdf: boolean };

const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const estPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

const COTE_ENVOI = 1600;
const boutonSecondaire = "rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60";
const boutonPrincipal = "rounded-lg bg-arbre px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60";
const normaliser = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const texteDe = (n: number | null) => (n === null ? "" : String(n));

// Date et position cachées dans le fichier d'origine. À lire avant de réduire l'image, qui les efface.
async function lireExif(fichier: File) {
  try {
    const { default: exifr } = await import("exifr");
    const d = await exifr.parse(fichier, { tiff: true, exif: true, gps: true, xmp: false, icc: false, iptc: false, jfif: false, ihdr: false });
    const brute = d?.DateTimeOriginal ?? d?.CreateDate;
    const date = brute instanceof Date && !Number.isNaN(brute.getTime()) ? brute : null;
    const gps = Number.isFinite(d?.latitude) && Number.isFinite(d?.longitude) ? { latitude: d.latitude as number, longitude: d.longitude as number } : null;
    return { date, gps };
  } catch {
    return { date: null, gps: null }; // format sans données, ou fichier inhabituel : on saisira à la main
  }
}

// Réduit l'image sans la recadrer. Le navigateur applique le bon sens de la photo. null s'il n'y arrive pas.
async function reduireImage(url: string): Promise<Blob | null> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const echelle = Math.min(1, COTE_ENVOI / Math.max(image.naturalWidth, image.naturalHeight));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(image.naturalWidth * echelle));
  toile.height = Math.max(1, Math.round(image.naturalHeight * echelle));
  const contexte = toile.getContext("2d");
  if (!contexte) return null;
  contexte.fillStyle = "#fff"; // sous les PNG transparents
  contexte.fillRect(0, 0, toile.width, toile.height);
  contexte.imageSmoothingQuality = "high";
  contexte.drawImage(image, 0, 0, toile.width, toile.height);
  return new Promise((resoudre) => toile.toBlob(resoudre, "image/jpeg", 0.92));
}

// Nom proposé au téléchargement d'un document : sa légende, sans caractères interdits dans un nom de fichier.
function nomTelechargement(legende: string | null) {
  const nom = (legende ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${nom || "document"}.pdf`;
}

function ChampsInfos({ infos, onChange, recherche, document }: { infos: Infos; onChange: (i: Infos) => void; recherche?: boolean; document?: boolean }) {
  const maj = (champ: keyof Infos) => (e: { target: { value: string } }) => onChange({ ...infos, [champ]: e.target.value });
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">{document ? "Date du document" : "Date de prise de vue"} (facultative, même partielle)</legend>
        <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
          <input aria-label="Jour" inputMode="numeric" maxLength={2} placeholder="Jour" value={infos.jour} onChange={maj("jour")} className={`${classeChamp} min-w-0`} />
          <select aria-label="Mois" value={infos.mois} onChange={maj("mois")} className={`${classeChamp} min-w-0 bg-white`}>
            <option value="">Mois</option>
            {MOIS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input aria-label="Année" inputMode="numeric" maxLength={4} placeholder="Année" value={infos.annee} onChange={maj("annee")} className={`${classeChamp} min-w-0`} />
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Lieu {recherche && <span className="font-normal text-foreground/60">(recherche de la commune…)</span>}
        <input value={infos.lieu} onChange={maj("lieu")} maxLength={150} placeholder="Par exemple : Lyon" className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Légende
        <input value={infos.legende} onChange={maj("legende")} maxLength={255} placeholder={document ? "Par exemple : Acte de naissance" : "Par exemple : Noël en famille"} className={classeChamp} />
      </label>
    </div>
  );
}

function versFormulaire(d: FormData, i: Infos) {
  d.set("jour", i.jour);
  d.set("mois", i.mois);
  d.set("annee", i.annee);
  d.set("lieu", i.lieu);
  d.set("legende", i.legende);
}

function FenetreAjout({
  attente,
  personneId,
  reste,
  onEnvoyee,
  onPasser,
  onAnnuler,
}: {
  attente: Attente;
  personneId: number;
  reste: number;
  onEnvoyee: (photoId: number) => void;
  onPasser: () => void;
  onAnnuler: () => void;
}) {
  const [infos, setInfos] = useState<Infos>({ jour: "", mois: "", annee: "", lieu: "", legende: "" });
  const [recherche, setRecherche] = useState(false);
  const [trouve, setTrouve] = useState<string>();
  const [erreur, setErreur] = useState<string>();
  const [enCours, demarrer] = useTransition();
  // Aperçu d'un PDF : undefined pendant la préparation, null si le navigateur n'a pas pu le dessiner.
  const [apercu, setApercu] = useState<{ image: Blob; url: string } | null | undefined>(attente.pdf ? undefined : null);

  useEffect(() => {
    if (!attente.pdf) return;
    let actif = true;
    let url: string | undefined;
    apercuPdf(attente.fichier).then((image) => {
      if (!actif) return;
      url = image ? URL.createObjectURL(image) : undefined;
      setApercu(image && url ? { image, url } : null);
      setTrouve(image ? "Un PDF ne contient pas de date fiable : saisissez-la si vous la connaissez." : "L'aperçu de ce PDF n'a pas pu être préparé : une icône le remplacera.");
    });
    return () => {
      actif = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attente]);

  useEffect(() => {
    if (attente.pdf) return;
    let actif = true;
    (async () => {
      const { date, gps } = await lireExif(attente.fichier);
      if (!actif) return;
      if (date) {
        setInfos((i) => (i.annee ? i : { ...i, jour: String(date.getDate()), mois: String(date.getMonth() + 1), annee: String(date.getFullYear()) }));
      }
      const message = [date ? "la date" : "", gps ? "la position" : ""].filter(Boolean).join(" et ");
      setTrouve(message ? `Trouvé dans la photo : ${message}. Vous pouvez corriger.` : "Aucune date ni lieu dans ce fichier : vous pouvez les saisir.");
      if (!gps) return;
      setRecherche(true);
      const lieu = await lieuDepuisGps(gps.latitude, gps.longitude).catch(() => null);
      if (!actif) return;
      setRecherche(false);
      if (lieu) setInfos((i) => (i.lieu ? i : { ...i, lieu }));
    })();
    return () => {
      actif = false;
    };
  }, [attente]);

  const envoyer = () =>
    demarrer(async () => {
      try {
        const donnees = new FormData();
        donnees.set("id", String(personneId));
        versFormulaire(donnees, infos);
        // Nom neutre : un nom avec espaces ou accents fait échouer l'envoi sur l'hébergement.
        if (attente.pdf) {
          donnees.set("format", "PDF");
          donnees.set("photo", new File([attente.fichier], "document.pdf", { type: "application/pdf" }));
          if (apercu) donnees.set("apercu", new File([apercu.image], "apercu.jpg", { type: "image/jpeg" }));
        } else {
          const image = await reduireImage(attente.url).catch(() => null);
          donnees.set("photo", image ? new File([image], "photo.jpg", { type: "image/jpeg" }) : new File([attente.fichier], "photo", { type: attente.fichier.type }));
        }
        const r = await ajouterPhotoGalerie(donnees);
        if (r.photoId) onEnvoyee(r.photoId);
        else setErreur(r.erreur);
      } catch (e) {
        console.error("Envoi de la photo impossible :", e);
        setErreur(`L'envoi ${attente.pdf ? "du document" : "de la photo"} a échoué. Vérifiez votre connexion, puis réessayez.`);
      }
    });

  const quoi = attente.pdf ? "un document" : "une photo";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Ajouter ${quoi}`} className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-auto flex w-full max-w-lg flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">
          Ajouter {quoi}
          {reste > 1 ? ` (encore ${reste})` : ""}
        </h2>
        {attente.pdf ? (
          apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu.url} alt="Première page du document" className="max-h-56 w-full rounded-lg bg-background object-contain" />
          ) : (
            <p className="flex h-32 items-center justify-center rounded-lg bg-background text-sm text-foreground/60">
              {apercu === undefined ? "Préparation de l'aperçu…" : "PDF sans aperçu"}
            </p>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attente.url} alt="Photo à ajouter" className="max-h-56 w-full rounded-lg bg-background object-contain" />
        )}
        {trouve && <p className="text-sm text-foreground/70">{trouve}</p>}
        <ChampsInfos infos={infos} onChange={setInfos} recherche={recherche} document={attente.pdf} />
        <Erreur>{erreur}</Erreur>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onAnnuler} disabled={enCours} className={boutonSecondaire}>
            Annuler
          </button>
          {reste > 1 && (
            <button type="button" onClick={onPasser} disabled={enCours} className={boutonSecondaire}>
              Passer {attente.pdf ? "ce document" : "cette photo"}
            </button>
          )}
          <button type="button" onClick={envoyer} disabled={enCours || apercu === undefined} className={boutonPrincipal}>
            {enCours ? "Envoi…" : "Ajouter et identifier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Visionneuse({
  photo,
  personneId,
  moi,
  personnes,
  suivante,
  precedente,
  aDesPhotosEnAttente,
  onFermer,
}: {
  photo: PhotoGalerie;
  personneId: number;
  moi: { id: number; admin: boolean };
  personnes: PersonneIdentifiable[] | null;
  suivante?: () => void;
  precedente?: () => void;
  aDesPhotosEnAttente: boolean;
  onFermer: () => void;
}) {
  const [repere, setRepere] = useState<{ x: number; y: number } | null>(null);
  const [survol, setSurvol] = useState<number | null>(null);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string>();
  const [edition, setEdition] = useState<Infos | null>(null);
  const [recadrage, setRecadrage] = useState(false);
  const [info, setInfo] = useState<string>();
  const [enCours, demarrer] = useTransition();
  const champ = useRef<HTMLInputElement>(null);
  const url = `/photos/${photo.fichier}.webp`;
  const pdf = photo.format === "PDF";
  const descriptif = phrasePrise(photo);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (recadrage) return;
      const dansChamp = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (e.key === "Escape") onFermer();
      else if (!dansChamp && e.key === "ArrowRight") suivante?.();
      else if (!dansChamp && e.key === "ArrowLeft") precedente?.();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [recadrage, onFermer, suivante, precedente]);

  const agir = (action: () => Promise<{ erreur?: string }>, apres?: () => void) =>
    demarrer(async () => {
      try {
        const r = await action();
        setErreur(r.erreur);
        if (!r.erreur) apres?.();
      } catch (e) {
        console.error("Action sur la photo impossible :", e);
        setErreur("L'action a échoué. Vérifiez votre connexion, puis réessayez.");
      }
    });

  // Trouve le visage identifié le plus proche de la souris. Calculé ici plutôt qu'avec une zone posée sur
  // l'image : un clic sur un visage continue ainsi de placer un repère.
  const survoler = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest("a")) return; // la souris est sur le nom affiché
    const r = e.currentTarget.getBoundingClientRect();
    let proche: number | null = null;
    let distanceMin = Math.max(36, 0.09 * Math.max(r.width, r.height));
    for (const p of photo.personnes) {
      if (p.x === null || p.y === null) continue;
      const distance = Math.hypot(e.clientX - r.left - p.x * r.width, e.clientY - r.top - p.y * r.height);
      if (distance <= distanceMin) {
        distanceMin = distance;
        proche = p.id;
      }
    }
    setSurvol(proche);
  };

  // Sur un document, pas de repère : on identifie seulement par le nom.
  const placer = (e: MouseEvent<HTMLImageElement>) => {
    if (pdf) return;
    const r = e.currentTarget.getBoundingClientRect();
    setRepere({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
    setErreur(undefined);
    champ.current?.focus();
  };

  const choisir = (id: number) =>
    agir(
      () => identifierPersonne(photo.id, id, repere?.x ?? null, repere?.y ?? null),
      () => {
        setRepere(null);
        setTexte("");
      },
    );

  const definirPortrait = (zone: ZoneRecadrage) => {
    setRecadrage(false);
    agir(async () => {
      // Une copie séparée : supprimer ensuite cette photo de la galerie ne touche pas au portrait.
      const image = await preparerImage(url, zone).catch(() => null);
      if (!image) return { erreur: "Le portrait n'a pas pu être préparé." };
      const donnees = new FormData();
      donnees.set("id", String(personneId));
      donnees.set("photo", new File([image], "photo.jpg", { type: "image/jpeg" }));
      return envoyerPhoto({}, donnees);
    }, () => setInfo("Le portrait a été mis à jour."));
  };

  const cherche = normaliser(texte.trim());
  const resultats = cherche && personnes ? personnes.filter((p) => normaliser(p.nom).includes(cherche)).slice(0, 8) : [];
  const peutSupprimer = moi.admin || photo.ajouteeParId === moi.id;

  return (
    <div role="dialog" aria-modal="true" aria-label={pdf ? "Document" : "Photo en grand"} className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-3 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={precedente} disabled={!precedente} aria-label="Photo précédente" className={boutonSecondaire}>
              ←
            </button>
            <button type="button" onClick={suivante} disabled={!suivante} aria-label="Photo suivante" className={boutonSecondaire}>
              →
            </button>
          </div>
          <button type="button" onClick={onFermer} className={boutonSecondaire}>
            {aDesPhotosEnAttente ? "Photo suivante à ajouter" : "Fermer"}
          </button>
        </div>

        <div className="flex justify-center">
          <div className="relative inline-block max-w-full" onMouseMove={survoler} onMouseLeave={() => setSurvol(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={photo.legende ?? `${pdf ? "Première page d'un document concernant" : "Photo avec"} ${photo.personnes.map((p) => p.nom).join(", ")}`}
              width={photo.largeur}
              height={photo.hauteur}
              onClick={placer}
              draggable={false}
              className={`block h-auto max-h-[65vh] w-auto max-w-full select-none rounded-lg ${pdf ? "ring-1 ring-black/10" : "cursor-crosshair"}`}
            />
            {photo.personnes
              .filter((p) => p.x !== null && p.y !== null)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/personnes/${p.id}`}
                  prefetch={false}
                  onClick={onFermer}
                  className="group pointer-events-none absolute flex -translate-x-1/2 translate-y-2 flex-col items-center outline-none"
                  style={{ left: `${p.x! * 100}%`, top: `${p.y! * 100}%`, zIndex: survol === p.id ? 1 : undefined }}
                >
                  {/* Aucune marque sur le visage. Sans souris (téléphone, tablette), les noms restent affichés. */}
                  <span
                    className={`whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-xs text-white transition-opacity group-focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 ${
                      survol === p.id ? "pointer-events-auto opacity-100" : "opacity-0"
                    }`}
                  >
                    {p.nom}
                  </span>
                </Link>
              ))}
            {repere && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-amber-300 bg-amber-300/30"
                style={{ left: `${repere.x * 100}%`, top: `${repere.y * 100}%` }}
              />
            )}
          </div>
        </div>

        {pdf && (
          <div className="flex flex-wrap justify-center gap-2">
            <a href={`/photos/${photo.fichier}.pdf`} target="_blank" rel="noopener" className={boutonPrincipal}>
              Ouvrir le PDF
            </a>
            <a href={`/photos/${photo.fichier}.pdf`} download={nomTelechargement(photo.legende)} className={`${boutonSecondaire} py-2`}>
              Télécharger
            </a>
          </div>
        )}

        {(photo.legende || descriptif) && (
          <div className="text-center">
            {photo.legende && <p className="font-medium">{photo.legende}</p>}
            {descriptif && <p className="text-sm text-foreground/70">{descriptif}</p>}
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{pdf ? "Personnes concernées" : "Sur cette photo"}</h3>
          <ul className="flex flex-wrap gap-2">
            {photo.personnes.map((p) => (
              <li key={p.id} className="flex items-center gap-1 rounded-full bg-arbre-doux px-3 py-1 text-sm">
                <Link href={`/personnes/${p.id}`} prefetch={false} onClick={onFermer} className="text-arbre underline">
                  {p.nom}
                </Link>
                {photo.personnes.length > 1 && (
                  <button
                    type="button"
                    disabled={enCours}
                    aria-label={`Retirer ${p.nom} de ${pdf ? "ce document" : "cette photo"}`}
                    title={`Retirer de ${pdf ? "ce document" : "cette photo"}`}
                    onClick={() => agir(() => retirerIdentification(photo.id, p.id))}
                    className="px-1 text-red-700"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-1">
          <label htmlFor="identifier-personne" className="text-sm font-semibold">
            Identifier une personne
          </label>
          <p className="text-sm text-foreground/70">
            {pdf
              ? "Tapez le nom d'une personne concernée par ce document."
              : repere
                ? "Repère placé : choisissez maintenant le nom."
                : "Cliquez sur un visage, puis tapez le nom. Vous pouvez aussi taper le nom sans placer de repère."}
          </p>
          <div className="flex gap-2">
            <input
              id="identifier-personne"
              ref={champ}
              type="search"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              maxLength={100}
              autoComplete="off"
              placeholder={personnes ? "Nom ou prénom" : "Chargement des personnes…"}
              className={`${classeChamp} min-w-0 flex-1`}
            />
            {repere && (
              <button type="button" onClick={() => setRepere(null)} className={boutonSecondaire}>
                Annuler le repère
              </button>
            )}
          </div>
          {resultats.length > 0 && (
            <ul className="flex flex-col rounded-lg border border-black/10">
              {resultats.map((p) => (
                <li key={p.id}>
                  <button type="button" disabled={enCours} onClick={() => choisir(p.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-arbre-doux">
                    {p.nom}
                    {p.precision && <span className="text-foreground/60"> ({p.precision})</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cherche && personnes && resultats.length === 0 && <p className="text-sm text-foreground/60">Personne de ce nom dans l&apos;arbre.</p>}
        </section>

        {edition && (
          <section className="flex flex-col gap-3 rounded-lg bg-background p-3">
            <ChampsInfos infos={edition} onChange={setEdition} document={pdf} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEdition(null)} className={boutonSecondaire}>
                Annuler
              </button>
              <button
                type="button"
                disabled={enCours}
                className={boutonPrincipal}
                onClick={() => {
                  const donnees = new FormData();
                  donnees.set("photoId", String(photo.id));
                  versFormulaire(donnees, edition);
                  agir(() => modifierInfosPhoto(donnees), () => setEdition(null));
                }}
              >
                Enregistrer
              </button>
            </div>
          </section>
        )}

        <Erreur>{erreur}</Erreur>
        {info && <p role="status" className="text-sm text-arbre">{info}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
          <button
            type="button"
            className={boutonSecondaire}
            onClick={() =>
              setEdition({
                jour: texteDe(photo.jourPrise),
                mois: texteDe(photo.moisPrise),
                annee: texteDe(photo.anneePrise),
                lieu: photo.lieu ?? "",
                legende: photo.legende ?? "",
              })
            }
          >
            Modifier date, lieu, légende
          </button>
          {!pdf && (
            <button type="button" disabled={enCours} onClick={() => setRecadrage(true)} className={boutonSecondaire}>
              Utiliser comme portrait
            </button>
          )}
          {peutSupprimer && (
            <button
              type="button"
              disabled={enCours}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              onClick={() => {
                if (
                  window.confirm(
                    pdf
                      ? "Supprimer ce document ? Il disparaîtra de la galerie de toutes les personnes concernées. Cette action est irréversible."
                      : "Supprimer cette photo ? Elle disparaîtra de la galerie de toutes les personnes identifiées. Cette action est irréversible.",
                  )
                )
                  agir(() => supprimerPhotoGalerie(photo.id), onFermer);
              }}
            >
              {pdf ? "Supprimer le document" : "Supprimer la photo"}
            </button>
          )}
          {photo.ajouteePar && (
            <span className="ml-auto text-xs text-foreground/50">
              {pdf ? "Ajouté" : "Ajoutée"} par {photo.ajouteePar}
            </span>
          )}
        </div>
      </div>
      {recadrage && <RecadragePhoto url={url} onValider={definirPortrait} onAnnuler={() => setRecadrage(false)} onErreur={() => setRecadrage(false)} />}
    </div>
  );
}

export function Galerie({
  personneId,
  photos,
  moi,
}: {
  personneId: number;
  photos: PhotoGalerie[];
  moi: { id: number; admin: boolean };
}) {
  const [file, setFile] = useState<Attente[]>([]);
  const [ouverteId, setOuverteId] = useState<number | null>(null);
  const [personnes, setPersonnes] = useState<PersonneIdentifiable[] | null>(null);
  const [erreur, setErreur] = useState<string>();
  const chargement = useRef(false);

  const indice = photos.findIndex((p) => p.id === ouverteId);
  const ouverte = indice >= 0 ? photos[indice] : null;

  // Une seule lecture de la liste, à la première photo ouverte : le quota de connexions MySQL est limité.
  useEffect(() => {
    if (!ouverte || chargement.current) return;
    chargement.current = true;
    listerPersonnesIdentifiables()
      .then(setPersonnes)
      .catch(() => {
        chargement.current = false;
        setErreur("La liste des personnes n'a pas pu être chargée.");
      });
  }, [ouverte]);

  const retirerPremiere = () =>
    setFile(([premiere, ...suite]) => {
      if (premiere) URL.revokeObjectURL(premiere.url);
      return suite;
    });
  const toutAnnuler = () =>
    setFile((f) => {
      f.forEach((a) => URL.revokeObjectURL(a.url));
      return [];
    });

  const choisirFichiers = (fichiers: FileList | null) => {
    const tous = [...(fichiers ?? [])];
    const valides = tous.filter((f) => f.size <= TAILLE_PHOTO_MAX && (TYPES_IMAGE.includes(f.type) || estPdf(f)));
    const ecartes = tous.length - valides.length;
    setErreur(ecartes ? `${ecartes} fichier${ecartes > 1 ? "s" : ""} écarté${ecartes > 1 ? "s" : ""} : JPEG, PNG, WebP ou PDF de 10 Mo au plus.` : undefined);
    setFile((f) => [...f, ...valides.map((fichier) => ({ fichier, url: URL.createObjectURL(fichier), pdf: estPdf(fichier) }))]);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Photos et documents{photos.length > 0 ? ` (${photos.length})` : ""}</h2>
        <label className="inline-block cursor-pointer rounded-lg border border-arbre px-3 py-1 text-sm font-medium text-arbre hover:bg-arbre-doux has-focus-visible:outline-2 has-focus-visible:outline-arbre">
          + Ajouter
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              choisirFichiers(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Erreur>{erreur}</Erreur>
      {photos.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune photo ni aucun document pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOuverteId(p.id)}
              aria-label={`Ouvrir ${p.format === "PDF" ? "le document" : "la photo"}${p.legende ? ` : ${p.legende}` : ""}`}
              className="relative overflow-hidden rounded-lg bg-arbre-doux ring-1 ring-black/5 transition hover:ring-2 hover:ring-arbre focus-visible:outline-2 focus-visible:outline-arbre"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/photos/${p.fichier}-v.webp`} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
              {p.format === "PDF" && <span className="absolute bottom-1 left-1 rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">PDF</span>}
            </button>
          ))}
        </div>
      )}

      {ouverte ? (
        <Visionneuse
          key={ouverte.id}
          photo={ouverte}
          personneId={personneId}
          moi={moi}
          personnes={personnes}
          precedente={indice > 0 ? () => setOuverteId(photos[indice - 1].id) : undefined}
          suivante={indice < photos.length - 1 ? () => setOuverteId(photos[indice + 1].id) : undefined}
          aDesPhotosEnAttente={file.length > 0}
          onFermer={() => setOuverteId(null)}
        />
      ) : (
        file[0] && (
          <FenetreAjout
            key={file[0].url}
            attente={file[0]}
            personneId={personneId}
            reste={file.length}
            onPasser={retirerPremiere}
            onAnnuler={toutAnnuler}
            onEnvoyee={(photoId) => {
              retirerPremiere();
              setOuverteId(photoId);
            }}
          />
        )
      )}
    </section>
  );
}
