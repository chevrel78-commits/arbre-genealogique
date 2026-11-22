import Link from "next/link";
import { Suspense } from "react";
import { TuilePersonne } from "@/components/tuile-personne";
import { exigerMembre } from "@/lib/acces";
import { prisma } from "@/lib/prisma";

// Accueil des membres : les personnes de l'arbre, sous forme de tuiles. Le dessin de l'arbre arrivera à l'étape 5.

const boutonAjouter = "rounded-lg bg-arbre px-4 py-2 text-center font-medium text-white hover:opacity-90";

async function Contenu() {
  // Protection : sans session valide (ou compte non accepté), renvoi vers /connexion.
  const membre = await exigerMembre();
  const personnes = await prisma.personne.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }, { id: "asc" }],
    select: { id: true, civilite: true, prenom: true, nom: true, nomJeuneFille: true, anneeNaissance: true },
  });
  const nombre = personnes.length;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Bonjour {membre.prenom}</h1>
          <p className="text-foreground/70">
            {nombre === 0
              ? "Bienvenue sur l'arbre généalogique de la famille."
              : `L'arbre compte ${nombre} personne${nombre > 1 ? "s" : ""}.`}
          </p>
        </div>
        {nombre > 0 && (
          <Link href="/personnes/nouvelle" className={boutonAjouter}>
            Ajouter une personne
          </Link>
        )}
      </div>

      {nombre === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
          <p className="max-w-sm text-foreground/70">L&apos;arbre est encore vide. Commencez par ajouter une première personne.</p>
          <Link href="/personnes/nouvelle" className={boutonAjouter}>
            Ajouter une personne
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {personnes.map((p) => (
            <TuilePersonne key={p.id} personne={p} />
          ))}
        </div>
      )}
    </>
  );
}

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-foreground/50">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
