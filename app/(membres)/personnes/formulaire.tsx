"use client";
// Formulaire commun à l'ajout et à la modification d'une personne.
import Link from "next/link";
import { useActionState } from "react";
import { enregistrerPersonne, type EtatPersonne, type ValeursPersonne } from "./actions";
import { BoutonPrincipal, Champ, classeChamp, Erreur } from "@/components/formulaire";
import { CIVILITES, MOIS, type CodeCivilite } from "@/lib/personnes";

export function FormulairePersonne({ id, initiales }: { id?: number; initiales?: ValeursPersonne }) {
  const [etat, action, enCours] = useActionState<EtatPersonne, FormData>(enregistrerPersonne, {});
  // Après l'envoi, React remet le formulaire à ses valeurs « par défaut » : en cas d'erreur, ce sont
  // celles que la personne vient de saisir, y compris la civilité cochée.
  const v = etat.valeurs ?? initiales;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      {id !== undefined && <input type="hidden" name="id" value={id} />}

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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Date de naissance (facultative)</legend>
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] gap-2">
          <Champ
            libelle="Jour"
            name="jourNaissance"
            inputMode="numeric"
            pattern="[0-9]{1,2}"
            maxLength={2}
            title="Le jour, par exemple 12"
            autoComplete="off"
            defaultValue={v?.jourNaissance}
          />
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
            Mois
            {/* La clé recrée la liste quand le mois renvoyé change : sinon la remise à zéro du formulaire la viderait. */}
            <select
              key={v?.moisNaissance ?? ""}
              name="moisNaissance"
              defaultValue={v?.moisNaissance ?? ""}
              className={`${classeChamp} w-full bg-white`}
            >
              <option value="">—</option>
              {MOIS.map((mois, i) => (
                <option key={mois} value={i + 1}>
                  {mois}
                </option>
              ))}
            </select>
          </label>
          <Champ
            libelle="Année"
            name="anneeNaissance"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            title="Quatre chiffres, par exemple 1950"
            autoComplete="off"
            defaultValue={v?.anneeNaissance}
          />
        </div>
        <span className="text-xs text-foreground/60">Vous pouvez n&apos;indiquer que l&apos;année, ou le mois et l&apos;année.</span>
      </fieldset>

      <Champ
        libelle="Lieu de naissance (facultatif)"
        name="lieuNaissance"
        maxLength={150}
        placeholder="Par exemple : Lyon (Rhône)"
        autoComplete="off"
        defaultValue={v?.lieuNaissance}
      />

      <Erreur>{etat.erreur}</Erreur>
      <div className="flex flex-wrap items-center gap-4">
        <BoutonPrincipal enCours={enCours} texte="Enregistrer" texteEnCours="Enregistrement…" />
        <Link href={id !== undefined ? `/personnes/${id}` : "/"} className="text-sm text-arbre underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}
