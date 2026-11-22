import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

// Étape 0 : page d'accueil provisoire. Elle vérifie que le site parle bien à la base de données.

async function EtatBase() {
  // Lecture faite à chaque visite (et non au moment de la construction du site).
  await connection();
  let connectee = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    connectee = false;
    console.error("Base de données injoignable :", e);
  }
  return connectee ? (
    <p className="rounded-full bg-arbre-doux px-4 py-1 text-sm font-medium text-arbre">● Base de données : connectée</p>
  ) : (
    <p className="rounded-full bg-red-100 px-4 py-1 text-sm font-medium text-red-700">● Base de données : non connectée</p>
  );
}

export default function Accueil() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <svg viewBox="0 0 64 64" className="h-20 w-20 text-arbre" aria-hidden="true">
        <circle cx="32" cy="24" r="18" fill="currentColor" opacity="0.85" />
        <rect x="29" y="34" width="6" height="22" rx="2" fill="#6b4a2b" />
      </svg>
      <h1 className="text-3xl font-semibold sm:text-4xl">Arbre généalogique</h1>
      <p className="max-w-md text-foreground/70">
        L&apos;arbre de la famille, construit ensemble. Le site est en construction.
      </p>
      <Suspense fallback={<p className="text-sm text-foreground/50">Vérification de la base…</p>}>
        <EtatBase />
      </Suspense>
    </main>
  );
}
