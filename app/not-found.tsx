import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-foreground/70">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="text-arbre underline">Retour à l&apos;accueil</Link>
    </main>
  );
}
