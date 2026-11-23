// Calcul du dessin de l'arbre, sans base de données ni affichage : on donne des personnes et des familles,
// on reçoit la position de chaque tuile et le tracé de chaque trait. Trois temps :
// 1. donner à chaque personne sa génération, sans exception ;
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
  decede: boolean;
  anneeDeces: number | null;
  photo: string | null;
  familleOrigineId: number | null;
};
export type FamilleArbre = { id: number; parent1Id: number | null; parent2Id: number | null; marie: boolean; divorce: boolean };

export type NoeudArbre = { personne: PersonneArbre; x: number; y: number; generation: number };
export type TraitArbre = { cle: string; d: string; pointille: boolean; decalage?: number };
export type DispositionArbre = { largeur: number; hauteur: number; noeuds: NoeudArbre[]; traits: TraitArbre[] };

export const TUILE = { largeur: 136, hauteur: 140 };
const ECART_COUPLE = 28;
const ECART_GROUPES = 24;
const HAUTEUR_RANGEE = TUILE.hauteur + 92;
const MARGE = 24;

const parentsDe = (f: FamilleArbre) => [f.parent1Id, f.parent2Id].filter((x): x is number => x !== null);

// Les deux petites barres obliques qui signalent un couple divorcé.
const barresDivorce = (x: number, y: number) => `M${x - 5} ${y + 6}L${x - 1} ${y - 6}M${x + 1} ${y + 6}L${x + 5} ${y - 6}`;

// ---------------------------------------------------------------------------------------------------
// Ce que l'on affiche : branches repliées et belle-famille masquée (réglages propres à chaque navigateur)
// ---------------------------------------------------------------------------------------------------

export type ReglagesAffichage = { replies: number[]; sansBelleFamille: boolean };

function indexer(personnes: PersonneArbre[], familles: FamilleArbre[]) {
  const parId = new Map(personnes.map((p) => [p.id, p]));
  const familleParId = new Map(familles.map((f) => [f.id, f]));
  const enfants = new Map<number, number[]>();
  for (const p of personnes)
    if (p.familleOrigineId !== null) enfants.set(p.familleOrigineId, [...(enfants.get(p.familleOrigineId) ?? []), p.id]);
  const unions = new Map<number, FamilleArbre[]>();
  for (const f of familles) for (const x of parentsDe(f)) unions.set(x, [...(unions.get(x) ?? []), f]);
  return { parId, familleParId, enfants, unions };
}
type Index = ReturnType<typeof indexer>;

function descendants(id: number, { enfants, unions }: Index) {
  const vus = new Set<number>();
  const pile = [id];
  while (pile.length > 0) {
    for (const f of unions.get(pile.pop()!) ?? [])
      for (const e of enfants.get(f.id) ?? []) {
        if (vus.has(e)) continue;
        vus.add(e);
        pile.push(e);
      }
  }
  vus.delete(id);
  return vus;
}

// La famille de sang : les ancêtres, tous leurs descendants, et la fratrie même si les parents sont inconnus.
function familleDeSang(centreId: number, index: Index) {
  const sang = new Set([centreId]);
  const famillesVues = new Set<number>();
  const aVoir = [centreId];
  while (aVoir.length > 0) {
    const origine = index.parId.get(aVoir.pop()!)?.familleOrigineId;
    const f = origine != null ? index.familleParId.get(origine) : undefined;
    if (!f || famillesVues.has(f.id)) continue;
    famillesVues.add(f.id);
    for (const e of index.enfants.get(f.id) ?? []) sang.add(e);
    for (const p of parentsDe(f)) {
      sang.add(p);
      aVoir.push(p);
    }
  }
  for (const x of [...sang]) for (const d of descendants(x, index)) sang.add(d);
  return sang;
}

export function calculerAffichage(personnes: PersonneArbre[], familles: FamilleArbre[], centreId: number, reglages: ReglagesAffichage) {
  const index = indexer(personnes, familles);
  const masques = new Set<number>();

  if (reglages.sansBelleFamille) {
    const sang = familleDeSang(centreId, index);
    const gardes = new Set(sang);
    for (const s of sang) for (const u of index.unions.get(s) ?? []) for (const c of parentsDe(u)) gardes.add(c);
    for (const p of personnes) if (!gardes.has(p.id)) masques.add(p.id);
  }

  // Une branche qui contient la personne au centre reste ouverte : le centre est toujours visible.
  const replies = new Set<number>();
  const branches = new Set<number>();
  for (const r of reglages.replies) {
    if (!index.parId.has(r)) continue;
    const d = descendants(r, index);
    if (d.has(centreId)) continue;
    replies.add(r);
    for (const x of d) branches.add(x);
  }
  for (const x of branches) masques.add(x);

  // Le conjoint d'un descendant replié disparaît aussi, sauf s'il reste relié à quelqu'un de visible.
  const resteRelie = (c: number) => {
    const origine = index.parId.get(c)?.familleOrigineId;
    const f = origine != null ? index.familleParId.get(origine) : undefined;
    if (f && [...parentsDe(f), ...(index.enfants.get(f.id) ?? [])].some((x) => x !== c && !masques.has(x))) return true;
    return (index.unions.get(c) ?? []).some((u) =>
      [...parentsDe(u), ...(index.enfants.get(u.id) ?? [])].some((x) => x !== c && !masques.has(x)),
    );
  };
  for (const b of branches)
    for (const u of index.unions.get(b) ?? [])
      for (const c of parentsDe(u)) if (c !== centreId && !masques.has(c) && !resteRelie(c)) masques.add(c);

  return {
    visibles: personnes.filter((p) => !masques.has(p.id)),
    replies,
    nombreMasques: masques.size,
    nombreDescendants: new Map(personnes.map((p) => [p.id, descendants(p.id, index).size])),
  };
}

// ---------------------------------------------------------------------------------------------------
// 1. La rangée de chaque personne
// ---------------------------------------------------------------------------------------------------

// Tout le monde est dessiné. Les personnes reliées entre elles forment un bloc ; celles qui ne sont pas
// encore reliées au reste forment des blocs à part, placés à droite. Le résultat ne dépend pas de la
// personne centrale : recentrer déplace seulement la vue, jamais les tuiles.
export function calculerGenerations(personnes: PersonneArbre[], familles: FamilleArbre[]) {
  const ids = new Set(personnes.map((p) => p.id));
  const enfants = new Map<number, number[]>();
  for (const p of personnes)
    if (p.familleOrigineId !== null) enfants.set(p.familleOrigineId, [...(enfants.get(p.familleOrigineId) ?? []), p.id]);

  // Chaque lien indique l'écart de rangée : 0 pour un conjoint ou un frère, 1 d'un parent à son enfant.
  const voisins = new Map<number, [number, number][]>([...ids].map((id) => [id, []]));
  const relier = (a: number, b: number, ecart: number) => {
    voisins.get(a)!.push([b, ecart]);
    voisins.get(b)!.push([a, -ecart]);
  };
  const parentsPresents = (f: FamilleArbre) => parentsDe(f).filter((x) => ids.has(x));
  for (const f of familles) {
    const parents = parentsPresents(f);
    const fratrie = enfants.get(f.id) ?? [];
    if (parents.length === 2) relier(parents[0], parents[1], 0);
    for (const p of parents) for (const e of fratrie) relier(p, e, 1);
    for (const e of fratrie.slice(1)) relier(fratrie[0], e, 0);
  }

  const generation = new Map<number, number>();
  const blocs: number[][] = [];
  for (const depart of [...ids].sort((a, b) => a - b)) {
    if (generation.has(depart)) continue;
    generation.set(depart, 0);
    const bloc = [depart];
    for (let i = 0; i < bloc.length; i++)
      for (const [v, ecart] of voisins.get(bloc[i])!) {
        if (generation.has(v)) continue;
        generation.set(v, generation.get(bloc[i])! + ecart);
        bloc.push(v);
      }
    blocs.push(bloc);
  }

  // Un enfant est toujours sous ses parents, même après un mariage entre générations différentes.
  for (let tour = 0; tour <= personnes.length; tour++) {
    let change = false;
    for (const f of familles) {
      const parents = parentsPresents(f);
      if (parents.length === 0) continue;
      const minimum = Math.max(...parents.map((p) => generation.get(p)!)) + 1;
      for (const e of enfants.get(f.id) ?? [])
        if (generation.get(e)! < minimum) {
          generation.set(e, minimum);
          change = true;
        }
    }
    if (!change) break;
  }

  blocs.sort((a, b) => b.length - a.length || Math.min(...a) - Math.min(...b));
  return { generation, blocs };
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

export function disposer(personnes: PersonneArbre[], familles: FamilleArbre[], centreId: number): DispositionArbre {
  if (!personnes.some((p) => p.id === centreId)) return { largeur: 0, hauteur: 0, noeuds: [], traits: [] };
  const { generation, blocs } = calculerGenerations(personnes, familles);
  const parId = new Map(personnes.map((p) => [p.id, p]));

  // Chaque bloc est dessiné seul, puis placé à droite du précédent.
  const noeuds: NoeudArbre[] = [];
  const traits: TraitArbre[] = [];
  let decalage = 0;
  let hauteur = 0;
  for (const bloc of blocs) {
    const membres = new Set(bloc);
    const dessin = disposerBloc(
      bloc.map((id) => parId.get(id)!),
      familles.filter((f) => parentsDe(f).some((x) => membres.has(x)) || bloc.some((id) => parId.get(id)!.familleOrigineId === f.id)),
      new Map(bloc.map((id) => [id, generation.get(id)!])),
    );
    noeuds.push(...dessin.noeuds.map((n) => ({ ...n, x: n.x + decalage })));
    traits.push(...dessin.traits.map((t) => ({ ...t, decalage })));
    decalage += dessin.largeur;
    hauteur = Math.max(hauteur, dessin.hauteur);
  }
  return { largeur: decalage, hauteur, noeuds, traits };
}

function disposerBloc(personnes: PersonneArbre[], famillesToutes: FamilleArbre[], generation: Map<number, number>): DispositionArbre {
  const parId = new Map(personnes.map((p) => [p.id, p]));
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
        const barres = f.divorce ? barresDivorce(X(a) + TUILE.largeur + 7, y) : "";
        traits.push({ cle: `couple-${f.id}`, d: `M${X(a) + TUILE.largeur} ${y}H${X(b)}${barres}`, pointille: !f.marie });
        sources.set(f.id, { x: milieu, y, bas: BAS(a) });
      } else {
        // Conjoints éloignés (remariage, ou rangées différentes) : le trait passe sous les tuiles.
        const bas = Math.max(BAS(a), BAS(b));
        const niveau = niveauxCouples.get(bas) ?? 0;
        niveauxCouples.set(bas, niveau + 1);
        const y = bas + 8 + niveau * 6;
        const barres = f.divorce ? barresDivorce(milieu - 16, y) : "";
        traits.push({ cle: `couple-${f.id}`, d: `M${CX(a)} ${BAS(a)}V${y}H${CX(b)}V${BAS(b)}${barres}`, pointille: !f.marie });
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
    const rail = base + 20 + (niveau % 9) * 7;
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
