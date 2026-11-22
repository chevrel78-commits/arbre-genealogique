// Calcul du dessin de l'arbre, sans base de données ni affichage : on donne des personnes et des familles,
// on reçoit la position de chaque tuile et le tracé de chaque trait. Trois temps :
// 1. choisir qui montrer autour de la personne centrale (3 générations au-dessus, 3 en dessous) ;
// 2. ranger chaque génération sur sa rangée, les couples côte à côte, près de leurs parents et enfants ;
// 3. tracer les traits entre couples, parents et enfants.
import type { CodeCivilite } from "./personnes";

export type PersonneArbre = {
  id: number;
  civilite: CodeCivilite;
  prenom: string;
  nom: string;
  nomJeuneFille: string | null;
  anneeNaissance: number | null;
  familleOrigineId: number | null;
};
export type FamilleArbre = { id: number; parent1Id: number | null; parent2Id: number | null; marie: boolean };

export type NoeudArbre = { personne: PersonneArbre; x: number; y: number; generation: number };
export type TraitArbre = { cle: string; d: string; pointille: boolean };
export type DispositionArbre = { largeur: number; hauteur: number; noeuds: NoeudArbre[]; traits: TraitArbre[] };

export const TUILE = { largeur: 136, hauteur: 140 };
const ECART_COUPLE = 28;
const ECART_GROUPES = 24;
const HAUTEUR_RANGEE = TUILE.hauteur + 92;
const MARGE = 24;
export const PORTEE = 3;

const parentsDe = (f: FamilleArbre) => [f.parent1Id, f.parent2Id].filter((x): x is number => x !== null);

// ---------------------------------------------------------------------------------------------------
// 1. Qui montrer, et sur quelle rangée
// ---------------------------------------------------------------------------------------------------

export function selectionner(personnes: PersonneArbre[], familles: FamilleArbre[], centreId: number, portee = PORTEE) {
  const parId = new Map(personnes.map((p) => [p.id, p]));
  const familleParId = new Map(familles.map((f) => [f.id, f]));
  const enfants = new Map<number, number[]>();
  for (const p of personnes)
    if (p.familleOrigineId !== null) enfants.set(p.familleOrigineId, [...(enfants.get(p.familleOrigineId) ?? []), p.id]);
  const unions = new Map<number, FamilleArbre[]>();
  for (const f of familles) for (const x of parentsDe(f)) unions.set(x, [...(unions.get(x) ?? []), f]);

  // Une personne garde la première rangée trouvée : elle n'est dessinée qu'une fois.
  const generation = new Map<number, number>();
  const ajouter = (id: number, g: number) => {
    if (!parId.has(id) || generation.has(id)) return false;
    generation.set(id, g);
    return true;
  };

  const descendre = (id: number, g: number) => {
    for (const f of unions.get(id) ?? []) {
      for (const conjoint of parentsDe(f)) if (conjoint !== id) ajouter(conjoint, g);
      if (g >= portee) continue;
      for (const e of enfants.get(f.id) ?? []) if (ajouter(e, g + 1)) descendre(e, g + 1);
    }
  };

  const vus = new Set<number>();
  const monter = (id: number, g: number) => {
    if (vus.has(id)) return;
    vus.add(id);
    const origine = parId.get(id)?.familleOrigineId;
    const f = origine != null ? familleParId.get(origine) : undefined;
    if (!f) return;
    for (const frere of enfants.get(f.id) ?? []) ajouter(frere, g);
    if (g <= -portee) return;
    for (const parent of parentsDe(f)) {
      ajouter(parent, g - 1);
      // Les autres unions d'un parent : ses autres conjoints et les demi-frères ou demi-sœurs.
      for (const u of unions.get(parent) ?? []) {
        for (const conjoint of parentsDe(u)) ajouter(conjoint, g - 1);
        for (const e of enfants.get(u.id) ?? []) ajouter(e, g);
      }
      monter(parent, g - 1);
    }
  };

  ajouter(centreId, 0);
  descendre(centreId, 0);
  monter(centreId, 0);
  return generation;
}

// ---------------------------------------------------------------------------------------------------
// 2. Ranger chaque génération
// ---------------------------------------------------------------------------------------------------

// Un groupe = des personnes de la même rangée liées par des couples (un remariage en réunit plus de deux).
type Groupe = { ids: number[]; decalages: number[]; largeur: number; x: number };

function creerGroupes(ids: number[], parId: Map<number, PersonneArbre>, couples: [number, number][]): Groupe[] {
  const voisins = new Map<number, number[]>(ids.map((id) => [id, []]));
  for (const [a, b] of couples) {
    if (!voisins.has(a) || !voisins.has(b)) continue;
    voisins.get(a)!.push(b);
    voisins.get(b)!.push(a);
  }
  const hommeDabord = (a: number, b: number) =>
    Number(parId.get(a)?.civilite !== "M") - Number(parId.get(b)?.civilite !== "M") || a - b;

  const vus = new Set<number>();
  const groupes: Groupe[] = [];
  for (const depart of ids) {
    if (vus.has(depart)) continue;
    // Tout le groupe, puis on commence par une extrémité pour garder les conjoints voisins.
    const membres: number[] = [];
    const pile = [depart];
    const dansGroupe = new Set<number>();
    while (pile.length > 0) {
      const x = pile.pop()!;
      if (dansGroupe.has(x)) continue;
      dansGroupe.add(x);
      membres.push(x);
      pile.push(...voisins.get(x)!);
    }
    const debut = [...membres].sort((a, b) => voisins.get(a)!.length - voisins.get(b)!.length || hommeDabord(a, b))[0];
    const ordre: number[] = [];
    const parcourir = (x: number) => {
      if (vus.has(x)) return;
      vus.add(x);
      ordre.push(x);
      for (const v of [...voisins.get(x)!].sort(hommeDabord)) parcourir(v);
    };
    parcourir(debut);
    groupes.push({
      ids: ordre,
      decalages: ordre.map((_, i) => i * (TUILE.largeur + ECART_COUPLE)),
      largeur: ordre.length * TUILE.largeur + (ordre.length - 1) * ECART_COUPLE,
      x: 0,
    });
  }
  return groupes;
}

// Place les groupes au plus près de la position souhaitée, sans chevauchement et sans changer leur ordre.
function placer(groupes: Groupe[], souhaits: number[]) {
  type Bloc = { somme: number; nombre: number; indices: number[]; largeur: number; decalages: number[] };
  const blocs: Bloc[] = [];
  const position = (b: Bloc) => b.somme / b.nombre;
  groupes.forEach((g, i) => {
    let bloc: Bloc = { somme: souhaits[i], nombre: 1, indices: [i], largeur: g.largeur, decalages: [0] };
    while (blocs.length > 0) {
      const avant = blocs[blocs.length - 1];
      if (position(avant) + avant.largeur + ECART_GROUPES <= position(bloc)) break;
      blocs.pop();
      const decalage = avant.largeur + ECART_GROUPES;
      bloc = {
        somme: avant.somme + bloc.somme - bloc.nombre * decalage,
        nombre: avant.nombre + bloc.nombre,
        indices: [...avant.indices, ...bloc.indices],
        largeur: decalage + bloc.largeur,
        decalages: [...avant.decalages, ...bloc.decalages.map((d) => d + decalage)],
      };
    }
    blocs.push(bloc);
  });
  for (const b of blocs) b.indices.forEach((indice, k) => (groupes[indice].x = position(b) + b.decalages[k]));
}

// ---------------------------------------------------------------------------------------------------
// Le dessin complet
// ---------------------------------------------------------------------------------------------------

export function disposer(personnes: PersonneArbre[], famillesToutes: FamilleArbre[], centreId: number): DispositionArbre {
  const parId = new Map(personnes.map((p) => [p.id, p]));
  if (!parId.has(centreId)) return { largeur: 0, hauteur: 0, noeuds: [], traits: [] };
  const generation = selectionner(personnes, famillesToutes, centreId);
  const visible = (id: number | null): id is number => id !== null && generation.has(id);

  const enfantsVisibles = new Map<number, number[]>();
  for (const id of generation.keys()) {
    const f = parId.get(id)!.familleOrigineId;
    if (f !== null) enfantsVisibles.set(f, [...(enfantsVisibles.get(f) ?? []), id]);
  }
  const familles = famillesToutes.filter((f) => parentsDe(f).filter(visible).length === 2 || (enfantsVisibles.get(f.id)?.length ?? 0) > 0);

  const couples = familles
    .filter((f) => visible(f.parent1Id) && visible(f.parent2Id) && generation.get(f.parent1Id!) === generation.get(f.parent2Id!))
    .map((f) => [f.parent1Id!, f.parent2Id!] as [number, number]);

  // Les liens parents-enfants, qui attirent les tuiles les unes vers les autres.
  const voisins = new Map<number, number[]>([...generation.keys()].map((id) => [id, []]));
  for (const f of familles) {
    const parents = parentsDe(f).filter(visible);
    for (const e of enfantsVisibles.get(f.id) ?? [])
      for (const p of parents) {
        voisins.get(e)!.push(p);
        voisins.get(p)!.push(e);
      }
  }

  // Une rangée par génération ; les frères et sœurs ensemble, du plus âgé au plus jeune.
  const generations = [...new Set(generation.values())].sort((a, b) => a - b);
  const age = (id: number) => parId.get(id)!.anneeNaissance ?? 9999;
  const rangees = generations.map((g) => {
    const ids = [...generation.entries()]
      .filter(([, x]) => x === g)
      .map(([id]) => id)
      .sort((a, b) => (parId.get(a)!.familleOrigineId ?? 0) - (parId.get(b)!.familleOrigineId ?? 0) || age(a) - age(b) || a - b);
    const groupes = creerGroupes(ids, parId, couples);
    let x = 0;
    for (const groupe of groupes) {
      groupe.x = x;
      x += groupe.largeur + ECART_GROUPES;
    }
    return groupes;
  });

  const centreX = (id: number, positions: Map<number, number>) => positions.get(id)! + TUILE.largeur / 2;
  const lirePositions = () => {
    const positions = new Map<number, number>();
    for (const r of rangees) for (const g of r) g.ids.forEach((id, i) => positions.set(id, g.x + g.decalages[i]));
    return positions;
  };

  // Plusieurs passages, de haut en bas puis de bas en haut : chaque groupe se rapproche de sa famille.
  for (let passage = 0; passage < 16; passage++) {
    const sens = passage % 2 === 0 ? rangees : [...rangees].reverse();
    for (const rangee of sens) {
      const positions = lirePositions();
      const souhait = (g: Groupe) => {
        const valeurs = g.ids.flatMap((id, i) =>
          voisins.get(id)!.map((v) => centreX(v, positions) - TUILE.largeur / 2 - g.decalages[i]),
        );
        return valeurs.length > 0 ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : g.x;
      };
      const avecSouhait = rangee.map((g) => ({ g, s: souhait(g) }));
      // L'ordre ne change que dans les premiers passages, pour que le dessin se stabilise ensuite.
      if (passage < 8) avecSouhait.sort((a, b) => a.s - b.s);
      avecSouhait.forEach(({ g }, i) => (rangee[i] = g));
      placer(rangee, avecSouhait.map((a) => a.s));
    }
  }

  const positions = lirePositions();
  const minX = Math.min(...positions.values());
  const X = (id: number) => Math.round(positions.get(id)! - minX + MARGE);
  const Y = (id: number) => (generations.indexOf(generation.get(id)!) * HAUTEUR_RANGEE) + MARGE;
  const CX = (id: number) => X(id) + TUILE.largeur / 2;
  const BAS = (id: number) => Y(id) + TUILE.hauteur;

  const noeuds: NoeudArbre[] = [...generation.entries()].map(([id, g]) => ({ personne: parId.get(id)!, x: X(id), y: Y(id), generation: g }));
  const traits: TraitArbre[] = [];

  // Deux tuiles voisines d'un même groupe : le trait du couple passe directement entre elles.
  const voisinesDansGroupe = (a: number, b: number) =>
    rangees.some((r) => r.some((g) => g.ids.some((id, i) => (id === a && g.ids[i + 1] === b) || (id === b && g.ids[i + 1] === a))));

  // Point de départ des traits vers les enfants de chaque famille.
  const sources = new Map<number, { x: number; y: number; bas: number }>();
  const niveauxCouples = new Map<number, number>();
  for (const f of familles) {
    const parents = parentsDe(f).filter(visible);
    if (parents.length === 2) {
      const [a, b] = CX(parents[0]) <= CX(parents[1]) ? parents : [parents[1], parents[0]];
      const milieu = (CX(a) + CX(b)) / 2;
      if (Y(a) === Y(b) && voisinesDansGroupe(a, b)) {
        const y = Y(a) + TUILE.hauteur / 2;
        traits.push({ cle: `couple-${f.id}`, d: `M${X(a) + TUILE.largeur} ${y}H${X(b)}`, pointille: !f.marie });
        sources.set(f.id, { x: milieu, y, bas: BAS(a) });
      } else {
        // Conjoints éloignés (remariage, ou rangées différentes) : le trait passe sous les tuiles.
        const bas = Math.max(BAS(a), BAS(b));
        const niveau = niveauxCouples.get(bas) ?? 0;
        niveauxCouples.set(bas, niveau + 1);
        const y = bas + 8 + niveau * 6;
        traits.push({ cle: `couple-${f.id}`, d: `M${CX(a)} ${BAS(a)}V${y}H${CX(b)}V${BAS(b)}`, pointille: !f.marie });
        sources.set(f.id, { x: milieu, y, bas: y });
      }
    } else if (parents.length === 1) {
      sources.set(f.id, { x: CX(parents[0]), y: BAS(parents[0]), bas: BAS(parents[0]) });
    }
  }

  // Rails horizontaux vers les enfants : ceux qui se croiseraient passent à des hauteurs différentes.
  const occupes = new Map<number, [number, number, number][]>();
  for (const f of familles) {
    const enfants = enfantsVisibles.get(f.id) ?? [];
    if (enfants.length === 0) continue;
    const xs = enfants.map(CX);
    const source = sources.get(f.id);

    if (!source) {
      // Parents inconnus : un simple trait au-dessus de la fratrie.
      if (enfants.length < 2) continue;
      const rail = Math.min(...enfants.map(Y)) - 14;
      traits.push({
        cle: `fratrie-${f.id}`,
        d: `M${Math.min(...xs)} ${rail}H${Math.max(...xs)}${enfants.map((e) => `M${CX(e)} ${rail}V${Y(e)}`).join("")}`,
        pointille: true,
      });
      continue;
    }

    const debut = Math.min(source.x, ...xs);
    const fin = Math.max(source.x, ...xs);
    const base = Math.ceil(source.bas);
    const pris = occupes.get(base) ?? [];
    let niveau = 0;
    while (pris.some(([n, a, b]) => n === niveau && debut <= b + 6 && fin >= a - 6)) niveau++;
    pris.push([niveau, debut, fin]);
    occupes.set(base, pris);
    const rail = base + 22 + (niveau % 6) * 8;
    traits.push({
      cle: `enfants-${f.id}`,
      d: `M${source.x} ${source.y}V${rail}M${debut} ${rail}H${fin}${enfants.map((e) => `M${CX(e)} ${rail}V${Y(e)}`).join("")}`,
      pointille: false,
    });
  }

  return {
    largeur: Math.max(...noeuds.map((n) => n.x)) + TUILE.largeur + MARGE,
    hauteur: Math.max(...noeuds.map((n) => n.y)) + TUILE.hauteur + MARGE,
    noeuds,
    traits,
  };
}

// La personne affichée au centre par défaut : celle qui porte le nom du membre, sinon la première fiche.
export function centreParDefaut(personnes: { id: number; prenom: string; nom: string }[], membre: { prenom: string; nom: string }) {
  const simple = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
  const trouvee = personnes
    .filter((p) => simple(p.prenom) === simple(membre.prenom) && simple(p.nom) === simple(membre.nom))
    .sort((a, b) => a.id - b.id)[0];
  return trouvee?.id ?? Math.min(...personnes.map((p) => p.id));
}
