// Barrière rapide à l'entrée du site : sans cookie de session, toute page renvoie vers /connexion.
// Ce n'est qu'un premier filtre (le cookie n'est pas vérifié en base ici) : la vraie protection est
// exigerMembre() dans chaque page (lib/acces.ts).
import { NextResponse, type NextRequest } from "next/server";

const NOM_COOKIE = "arbre_session"; // même nom que dans lib/session.ts
// Pages visibles sans être connecté : chacune ne montre aucune donnée de l'arbre.
const PAGES_PUBLIQUES = ["/connexion", "/demande-acces", "/mot-de-passe-oublie", "/nouveau-mot-de-passe"];

export function proxy(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  if (PAGES_PUBLIQUES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (requete.cookies.has(NOM_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/connexion", requete.url));
}

export const config = {
  // Tout, sauf les fichiers techniques de Next.js et l'icône du site.
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
