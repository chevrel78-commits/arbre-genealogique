// Les règles des liens de famille. Tout repose sur la table Famille (un couple et ses enfants) :
// - conjoint = l'autre parent d'une même famille ;
// - frère ou sœur = même famille d'origine ;
// - enfant = personne dont la famille d'origine est l'une de mes familles.
import type { Prisma } from "../generated/prisma/client";
import type { CodeCivilite, TypeLien } from "./personnes";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;
type Fam = { id: number; parent1Id: number | null; parent2Id: number | null };

// Erreur « normale », due à une règle : son message est affiché tel quel à l'utilisateur.
export class ErreurLien extends Error {}

export type OptionsLien = { union?: string; marie?: boolean; enfantsCommuns?: boolean };

const parentsDe = (f: Fam) => [f.parent1Id, f.parent2Id].filter((x): x is number => x !== null);

// ---------------------------------------------------------------------------------------------------
// Enregistrement « tout ou rien »
// ---------------------------------------------------------------------------------------------------

// Une transaction annule tout si une étape échoue. Le verrou sur la première ligne de Membre fait passer
// les modifications de liens une par une : deux personnes ne peuvent pas créer une incohérence en même temps.
export async function avecVerrou<T>(travail: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM Membre ORDER BY id LIMIT 1 FOR UPDATE`;
      const resultat = await travail(tx);
      await nettoyerFamilles(tx);
      await verifierCoherence(tx);
      return resultat;
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

// Fusionne les familles qui ont les mêmes parents et retire celles qui n'ont plus de raison d'être.
async function nettoyerFamilles(tx: Tx) {
  const familles = await tx.famille.findMany({ select: { id: true, parent1Id: true, parent2Id: true }, orderBy: { id: "asc" } });
  const parCouple = new Map<string, number>();
  for (const f of familles) {
    const parents = parentsDe(f).sort((a, b) => a - b);
    if (parents.length === 0) continue;
    const cle = parents.join("-");
    const gardee = parCouple.get(cle);
    if (gardee === undefined) {
      parCouple.set(cle, f.id);
      continue;
    }
    await tx.personne.updateMany({ where: { familleOrigineId: f.id }, data: { familleOrigineId: gardee } });
    await tx.famille.delete({ where: { id: f.id } });
  }

  const restantes = await tx.famille.findMany({
    select: { id: true, parent1Id: true, parent2Id: true, _count: { select: { enfants: true } } },
  });
  for (const f of restantes) {
    const nbParents = parentsDe(f).length;
    const nbEnfants = f._count.enfants;
    if (nbParents <= 1 && nbEnfants === 0) await tx.famille.delete({ where: { id: f.id } });
    else if (nbParents === 0 && nbEnfants === 1) {
      await tx.personne.updateMany({ where: { familleOrigineId: f.id }, data: { familleOrigineId: null } });
      await tx.famille.delete({ where: { id: f.id } });
    }
  }
}

// Dernier contrôle avant d'enregistrer : personne n'est son propre ancêtre, ni le conjoint d'un ancêtre.
async function verifierCoherence(tx: Tx) {
  const [personnes, familles] = await Promise.all([
    tx.personne.findMany({ select: { id: true, familleOrigineId: true } }),
    tx.famille.findMany({ select: { id: true, parent1Id: true, parent2Id: true } }),
  ]);
  const parentsParFamille = new Map(familles.map((f) => [f.id, parentsDe(f)]));
  const origine = new Map(personnes.map((p) => [p.id, p.familleOrigineId]));
  const parentsDirects = (id: number) => parentsParFamille.get(origine.get(id) ?? -1) ?? [];

  const ancetres = (id: number) => {
    const vus = new Set<number>();
    const aVoir = [...parentsDirects(id)];
    while (aVoir.length > 0) {
      const x = aVoir.pop()!;
      if (vus.has(x)) continue;
      vus.add(x);
      aVoir.push(...parentsDirects(x));
    }
    return vus;
  };

  for (const p of personnes)
    if (ancetres(p.id).has(p.id)) throw new ErreurLien("Ce lien est impossible : une personne deviendrait son propre ancêtre.");
  for (const f of familles) {
    if (f.parent1Id === null || f.parent2Id === null) continue;
    if (f.parent1Id === f.parent2Id) throw new ErreurLien("Une personne ne peut pas être son propre conjoint.");
    if (ancetres(f.parent1Id).has(f.parent2Id) || ancetres(f.parent2Id).has(f.parent1Id))
      throw new ErreurLien("Ce lien est impossible : un parent et son descendant ne peuvent pas former un couple.");
  }
}

// ---------------------------------------------------------------------------------------------------
// Ajouter un lien
// ---------------------------------------------------------------------------------------------------

function trouverFamille(tx: Tx, a: number, b: number | null) {
  return tx.famille.findFirst({
    where: { OR: [{ parent1Id: a, parent2Id: b }, { parent1Id: b, parent2Id: a }] },
    select: { id: true, parent1Id: true, parent2Id: true },
  });
}

const choisirOrigine = (tx: Tx, personneId: number, familleId: number) =>
  tx.personne.update({ where: { id: personneId }, data: { familleOrigineId: familleId } });

// Déplace tous les enfants d'une famille « parents inconnus » vers une autre famille.
async function fusionnerDans(tx: Tx, depuis: number, vers: number) {
  await tx.personne.updateMany({ where: { familleOrigineId: depuis }, data: { familleOrigineId: vers } });
  await tx.famille.delete({ where: { id: depuis } });
}

const champsRelies = {
  id: true,
  civilite: true,
  familleOrigine: {
    select: { id: true, parent1Id: true, parent2Id: true, parent1: { select: { civilite: true } }, parent2: { select: { civilite: true } } },
  },
} as const;

export async function relier(tx: Tx, lien: TypeLien, sourceId: number, cibleId: number, options: OptionsLien) {
  if (sourceId === cibleId) throw new ErreurLien("Une personne ne peut pas être reliée à elle-même.");
  const source = await tx.personne.findUnique({ where: { id: sourceId }, select: champsRelies });
  const cible = await tx.personne.findUnique({ where: { id: cibleId }, select: champsRelies });
  if (!source || !cible) throw new ErreurLien("Cette personne n'existe plus.");

  if (lien === "pere" || lien === "mere") {
    const estPere = lien === "pere";
    if ((cible.civilite === "M") !== estPere)
      throw new ErreurLien(estPere ? "Un père doit avoir la civilité M." : "Une mère doit avoir la civilité Mme ou Mlle.");
    const f = source.familleOrigine;
    if (!f) {
      const famille = (await trouverFamille(tx, cibleId, null)) ?? (await tx.famille.create({ data: { parent1Id: cibleId } }));
      await choisirOrigine(tx, sourceId, famille.id);
      return;
    }
    if (parentsDe(f).includes(cibleId)) throw new ErreurLien("Ce lien existe déjà.");
    if (parentsDe(f).length === 2) throw new ErreurLien("Cette personne a déjà deux parents.");
    const existant = f.parent1 ?? f.parent2;
    if (existant && (existant.civilite === "M") === estPere)
      throw new ErreurLien(estPere ? "Cette personne a déjà un père." : "Cette personne a déjà une mère.");
    await tx.famille.update({ where: { id: f.id }, data: f.parent1Id === null ? { parent1Id: cibleId } : { parent2Id: cibleId } });
    return;
  }

  if (lien === "frere" || lien === "soeur") {
    const estFrere = lien === "frere";
    if ((cible.civilite === "M") !== estFrere)
      throw new ErreurLien(estFrere ? "Un frère doit avoir la civilité M." : "Une sœur doit avoir la civilité Mme ou Mlle.");
    const f = source.familleOrigine;
    const g = cible.familleOrigine;
    if (f && g) {
      if (f.id === g.id) throw new ErreurLien("Ce lien existe déjà.");
      if (parentsDe(f).length === 0) await fusionnerDans(tx, f.id, g.id);
      else if (parentsDe(g).length === 0) await fusionnerDans(tx, g.id, f.id);
      else throw new ErreurLien("Ces deux personnes ont déjà des parents différents.");
    } else if (f) await choisirOrigine(tx, cibleId, f.id);
    else if (g) await choisirOrigine(tx, sourceId, g.id);
    else {
      const famille = await tx.famille.create({ data: {} }); // famille « parents inconnus »
      await choisirOrigine(tx, sourceId, famille.id);
      await choisirOrigine(tx, cibleId, famille.id);
    }
    return;
  }

  if (lien === "conjoint") {
    if (await trouverFamille(tx, sourceId, cibleId)) throw new ErreurLien("Ce lien existe déjà.");
    const marie = options.marie ?? true;
    const seul = options.enfantsCommuns ? await trouverFamille(tx, sourceId, null) : null;
    if (seul)
      await tx.famille.update({
        where: { id: seul.id },
        data: { marie, ...(seul.parent1Id === null ? { parent1Id: cibleId } : { parent2Id: cibleId }) },
      });
    else await tx.famille.create({ data: { parent1Id: sourceId, parent2Id: cibleId, marie } });
    return;
  }

  // Enfant : on rattache à l'union choisie, ou à une famille dont l'autre parent est inconnu.
  let familleId: number;
  if (options.union && options.union !== "seul") {
    const id = Number(options.union);
    const union = Number.isInteger(id)
      ? await tx.famille.findFirst({ where: { id, OR: [{ parent1Id: sourceId }, { parent2Id: sourceId }] }, select: { id: true } })
      : null;
    if (!union) throw new ErreurLien("Cette union n'existe plus.");
    familleId = union.id;
  } else {
    const famille = (await trouverFamille(tx, sourceId, null)) ?? (await tx.famille.create({ data: { parent1Id: sourceId } }));
    familleId = famille.id;
  }
  const g = cible.familleOrigine;
  if (!g) await choisirOrigine(tx, cibleId, familleId);
  else if (g.id === familleId) throw new ErreurLien("Ce lien existe déjà.");
  else if (parentsDe(g).length > 0) throw new ErreurLien("Cette personne a déjà des parents.");
  else await fusionnerDans(tx, g.id, familleId); // ses frères et sœurs la suivent
}

// ---------------------------------------------------------------------------------------------------
// Retirer un lien (les personnes restent dans l'arbre)
// ---------------------------------------------------------------------------------------------------

export async function retirerParent(tx: Tx, enfantId: number, parentId: number) {
  const enfant = await tx.personne.findUnique({ where: { id: enfantId }, select: { familleOrigine: { select: { id: true, parent1Id: true, parent2Id: true } } } });
  const f = enfant?.familleOrigine;
  if (!f || !parentsDe(f).includes(parentId)) throw new ErreurLien("Ce lien n'existe plus.");
  // L'enfant garde son autre parent, s'il en a un. Ses frères et sœurs ne changent pas.
  const autre = parentsDe(f).find((p) => p !== parentId);
  if (autre === undefined) {
    await tx.personne.update({ where: { id: enfantId }, data: { familleOrigineId: null } });
    return;
  }
  const famille = (await trouverFamille(tx, autre, null)) ?? (await tx.famille.create({ data: { parent1Id: autre } }));
  await choisirOrigine(tx, enfantId, famille.id);
}

export async function retirerConjoint(tx: Tx, a: number, b: number) {
  const f = await trouverFamille(tx, a, b);
  if (!f) throw new ErreurLien("Ce lien n'existe plus.");
  if ((await tx.personne.count({ where: { familleOrigineId: f.id } })) > 0)
    throw new ErreurLien("Ce couple a des enfants : retirez d'abord le lien avec ses enfants.");
  await tx.famille.delete({ where: { id: f.id } });
}

export async function retirerFrere(tx: Tx, sourceId: number, frereId: number) {
  const [source, frere] = [
    await tx.personne.findUnique({ where: { id: sourceId }, select: { familleOrigine: { select: { id: true, parent1Id: true, parent2Id: true } } } }),
    await tx.personne.findUnique({ where: { id: frereId }, select: { familleOrigineId: true } }),
  ];
  const f = source?.familleOrigine;
  if (!f || frere?.familleOrigineId !== f.id) throw new ErreurLien("Ce lien n'existe plus.");
  if (parentsDe(f).length > 0) throw new ErreurLien("Ils ont des parents connus : retirez plutôt le lien avec leurs parents.");
  await tx.personne.update({ where: { id: frereId }, data: { familleOrigineId: null } });
}

// ---------------------------------------------------------------------------------------------------
// Lecture : les proches d'une personne
// ---------------------------------------------------------------------------------------------------

export const champsTuile = { id: true, civilite: true, prenom: true, nom: true, nomJeuneFille: true, anneeNaissance: true, photo: true } as const;

type Tuile = {
  id: number;
  civilite: CodeCivilite;
  prenom: string;
  nom: string;
  nomJeuneFille: string | null;
  anneeNaissance: number | null;
  photo: string | null;
};

// Du plus âgé au plus jeune ; ceux dont l'année est inconnue à la fin.
const parAge = (a: Tuile, b: Tuile) =>
  (a.anneeNaissance ?? 9999) - (b.anneeNaissance ?? 9999) || a.prenom.localeCompare(b.prenom, "fr");

export async function chargerProches(id: number) {
  const p = await prisma.personne.findUnique({
    where: { id },
    select: {
      familleOrigine: { select: { id: true, parent1: { select: champsTuile }, parent2: { select: champsTuile }, enfants: { select: champsTuile } } },
      famillesParent1: { select: { id: true, marie: true, divorce: true, parent2: { select: champsTuile }, enfants: { select: champsTuile } } },
      famillesParent2: { select: { id: true, marie: true, divorce: true, parent1: { select: champsTuile }, enfants: { select: champsTuile } } },
    },
  });
  if (!p) return null;

  const origine = p.familleOrigine;
  const parents: Tuile[] = origine ? [origine.parent1, origine.parent2].filter((x) => x !== null) : [];
  const freres = (origine?.enfants ?? []).filter((e) => e.id !== id).sort(parAge);
  const parentsConnus = parents.length > 0;

  // Demi-frères et demi-sœurs : les enfants des autres familles de mes parents.
  const idsParents = parents.map((x) => x.id);
  const autres = origine && parentsConnus
    ? await prisma.famille.findMany({
        where: { id: { not: origine.id }, OR: [{ parent1Id: { in: idsParents } }, { parent2Id: { in: idsParents } }] },
        select: { enfants: { select: champsTuile } },
      })
    : [];
  const demis = [...new Map(autres.flatMap((f) => f.enfants).filter((e) => e.id !== id).map((e) => [e.id, e])).values()].sort(parAge);

  const unions = [
    ...p.famillesParent1.map((f) => ({ id: f.id, marie: f.marie, divorce: f.divorce, conjoint: f.parent2 as Tuile | null, enfants: f.enfants as Tuile[] })),
    ...p.famillesParent2.map((f) => ({ id: f.id, marie: f.marie, divorce: f.divorce, conjoint: f.parent1 as Tuile | null, enfants: f.enfants as Tuile[] })),
  ];
  const enfants = unions
    .flatMap((u) => u.enfants.map((e) => ({ ...e, autreParent: u.conjoint })))
    .sort(parAge);

  return { parents, freres, demis, unions, enfants, parentsConnus };
}

// Personnes de l'arbre que l'on peut relier : la recherche ignore les accents et les majuscules.
const normaliser = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export async function chercherCandidats(lien: TypeLien, exclus: Set<number>, recherche: string) {
  const personnes = await prisma.personne.findMany({ select: champsTuile, orderBy: [{ nom: "asc" }, { prenom: "asc" }, { id: "asc" }] });
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  return personnes
    .filter((p) => {
      if (exclus.has(p.id)) return false;
      if ((lien === "pere" || lien === "frere") && p.civilite !== "M") return false;
      if ((lien === "mere" || lien === "soeur") && p.civilite === "M") return false;
      const texte = normaliser(`${p.prenom} ${p.nom} ${p.nomJeuneFille ?? ""}`);
      return mots.every((m) => texte.includes(m));
    })
    .slice(0, 20);
}
