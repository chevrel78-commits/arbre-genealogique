import type { Metadata } from "next";
import { Suspense } from "react";
import { LienSupport } from "@/components/lien-support";
import { TEXTE_GUIDE } from "@/generated/guide";
import { exigerMembre } from "@/lib/acces";
import { lireGuide, RUBRIQUE_ADMIN, type Bloc } from "@/lib/guide";

export const metadata: Metadata = { title: "Aide · Arbre généalogique" };

// Met en gras ce qui est entre ** dans le guide.
function Texte({ texte }: { texte: string }) {
  return texte.split(/\*\*(.+?)\*\*/g).map((morceau, i) => (i % 2 === 1 ? <strong key={i}>{morceau}</strong> : morceau));
}

function Blocs({ blocs }: { blocs: Bloc[] }) {
  return blocs.map((b, i) => {
    if (b.type === "p")
      return (
        <p key={i}>
          <Texte texte={b.texte} />
        </p>
      );
    const Liste = b.type;
    return (
      <Liste key={i} className={`flex flex-col gap-1 pl-5 ${b.type === "ul" ? "list-disc" : "list-decimal"}`}>
        {b.items.map((item, j) => (
          <li key={j}>
            <Texte texte={item} />
          </li>
        ))}
      </Liste>
    );
  });
}

async function Contenu() {
  const moi = await exigerMembre();
  const { introduction, rubriques } = lireGuide(TEXTE_GUIDE);
  // La partie administration n'est envoyée qu'aux administrateurs.
  const visibles = rubriques.filter((r) => moi.admin || r.titre !== RUBRIQUE_ADMIN);

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Sommaire" className="lg:sticky lg:top-4 lg:self-start">
        <h2 className="mb-2 font-semibold">Sommaire</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {visibles.map((r) => (
            <li key={r.id}>
              <a href={`#${r.id}`} className="block rounded-lg px-2 py-1 text-arbre hover:bg-arbre-doux">
                {r.titre}
              </a>
            </li>
          ))}
          <li>
            <a href="#support" className="block rounded-lg px-2 py-1 text-arbre hover:bg-arbre-doux">
              Besoin d&apos;aide ?
            </a>
          </li>
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-8 leading-relaxed break-words">
        <div className="flex flex-col gap-3">
          <Blocs blocs={introduction} />
        </div>
        {visibles.map((r) => (
          <section key={r.id} id={r.id} className="flex scroll-mt-4 flex-col gap-3">
            <h2 className="text-xl font-semibold text-arbre">{r.titre}</h2>
            <Blocs blocs={r.blocs} />
          </section>
        ))}
        <section id="support" className="flex scroll-mt-4 flex-col items-start gap-2 rounded-xl bg-arbre-doux p-4">
          <h2 className="text-xl font-semibold text-arbre">Besoin d&apos;aide ?</h2>
          <p>Vous ne trouvez pas la réponse ? Écrivez au support :</p>
          <LienSupport />
        </section>
      </div>
    </div>
  );
}

export default function PageAide() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Aide</h1>
      <Suspense fallback={<p className="text-foreground/50">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
