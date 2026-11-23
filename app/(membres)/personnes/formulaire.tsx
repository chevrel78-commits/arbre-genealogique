"use client";
// Formulaire commun à l'ajout et à la modification d'une personne.
import Link from "next/link";
import { useActionState } from "react";
import { enregistrerPersonne } from "./actions";
import { ChampsLien, type OptionsFormulaireLien } from "./champs-lien";
import { BoutonPrincipal, Champ, classeChamp, Erreur } from "@/components/formulaire";
import { LONGUEUR_INFORMATION, type EtatPersonne, type ValeursPersonne } from "@/lib/formulaire-personne";
import { CIVILITES, MOIS, type CodeCivilite } from "@/lib/personnes";

// Trois champs Jour, Mois, Année, pour la naissance comme pour le décès.
function ChampsDate({ titre, suffixe, v }: { titre: string; suffixe: "Naissance" | "Deces"; v?: Partial<ValeursPersonne> }) {
  const jour = `jour${suffixe}` as const;
  const mois = `mois${suffixe}` as const;
  const annee = `annee${suffixe}` as const;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{titre}</legend>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] gap-2">
        <Champ
          libelle="Jour"
          name={jour}
          inputMode="numeric"
          pattern="[0-9]{1,2}"
          maxLength={2}
          title="Le jour, par exemple 12"
          autoComplete="off"
          defaultValue={v?.[jour]}
        />
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          Mois
          {/* La clé recrée la liste quand le mois renvoyé change : sinon la remise à zéro du formulaire la viderait. */}
          <select key={v?.[mois] ?? ""} name={mois} defaultValue={v?.[mois] ?? ""} className={`${classeChamp} w-full bg-white`}>
            <option value="">—</option>
            {MOIS.map((nomMois, i) => (
              <option key={nomMois} value={i + 1}>
                {nomMois}
              </option>
            ))}
          </select>
        </label>
        <Champ
          libelle="Année"
          name={annee}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          title="Quatre chiffres, par exemple 1950"
          autoComplete="off"
          defaultValue={v?.[annee]}
        />
      </div>
      <span className="text-xs text-foreground/60">Vous pouvez n&apos;indiquer que l&apos;année, ou le mois et l&apos;année.</span>
    </fieldset>
  );
}

export function FormulairePersonne({
  id,
  initiales,
  actionServeur = enregistrerPersonne,
  champsCaches,
  optionsLien,
  retour,
}: {
  id?: number;
  initiales?: Partial<ValeursPersonne>;
  actionServeur?: (etat: EtatPersonne, d: FormData) => Promise<EtatPersonne>;
  champsCaches?: Record<string, string>;
  optionsLien?: OptionsFormulaireLien;
  retour?: string;
}) {
  const [etat, action, enCours] = useActionState<EtatPersonne, FormData>(actionServeur, {});
  // Après l'envoi, React remet le formulaire à ses valeurs « par défaut » : en cas d'erreur, ce sont
  // celles que la personne vient de saisir, y compris la civilité cochée.
  const v = etat.valeurs ?? initiales;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      {Object.entries(champsCaches ?? {}).map(([nom, valeur]) => (
        <input key={nom} type="hidden" name={nom} value={valeur} />
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Civilité</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CIVILITES) as CodeCivilite[]).map((code) => (
            <label
              key={code}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/15 px-4 py-2 has-checked:border-arbre has-checked:bg-arbre-doux has-checked:text-arbre"
            >
              <input
                type="radio"
                name="civilite"
                value={code}
                required
                defaultChecked={v?.civilite === code}
                className="accent-arbre"
              />
              {CIVILITES[code]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Prénom" name="prenom" required maxLength={100} autoComplete="off" defaultValue={v?.prenom} />
        <Champ libelle="Nom" name="nom" required maxLength={100} autoComplete="off" defaultValue={v?.nom} />
      </div>
      <Champ
        libelle="Nom de jeune fille (facultatif)"
        name="nomJeuneFille"
        maxLength={100}
        autoComplete="off"
        defaultValue={v?.nomJeuneFille}
      />

      <ChampsDate titre="Date de naissance (facultative)" suffixe="Naissance" v={v} />

      <Champ
        libelle="Lieu de naissance (facultatif)"
        name="lieuNaissance"
        maxLength={150}
        placeholder="Par exemple : Lyon (Rhône)"
        autoComplete="off"
        defaultValue={v?.lieuNaissance}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="decede" defaultChecked={v?.decede === "on"} className="h-4 w-4 accent-arbre" />
          Décédé(e)
        </label>
        <ChampsDate titre="Date du décès (facultative)" suffixe="Deces" v={v} />
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Information (facultative)
        <textarea
          name="information"
          rows={4}
          maxLength={LONGUEUR_INFORMATION}
          defaultValue={v?.information}
          placeholder="Par exemple : métier, anecdote, souvenir…"
          className={classeChamp}
        />
        <span className="text-xs font-normal text-foreground/60">Visible par tous les membres, {LONGUEUR_INFORMATION} caractères au plus.</span>
      </label>

      <ChampsLien options={optionsLien} etat={etat} />

      <Erreur>{etat.erreur}</Erreur>
      <div className="flex flex-wrap items-center gap-4">
        <BoutonPrincipal enCours={enCours} texte="Enregistrer" texteEnCours="Enregistrement…" />
        <Link href={retour ?? (id !== undefined ? `/personnes/${id}` : "/")} className="text-sm text-arbre underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}
