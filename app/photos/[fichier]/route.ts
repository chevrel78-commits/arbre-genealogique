import { membreDeLaSession } from "@/lib/session";
import { lirePhoto } from "@/lib/stockage";

// Sert une photo ou un document PDF, aux membres acceptés seulement : même avec le lien exact, un visiteur
// ne voit rien. Contenu figé (un nouveau fichier a un nouveau nom) : gardé un jour, dans le navigateur uniquement.
export async function GET(_requete: Request, contexte: RouteContext<"/photos/[fichier]">) {
  const membre = await membreDeLaSession();
  if (membre?.statut !== "ACCEPTE") return new Response("Connexion nécessaire.", { status: 401 });

  const { fichier } = await contexte.params;
  const contenu = await lirePhoto(fichier);
  if (!contenu) return new Response("Fichier introuvable.", { status: 404 });

  const pdf = fichier.endsWith(".pdf");
  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": pdf ? "application/pdf" : "image/webp",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      // Un PDF s'ouvre dans la visionneuse du navigateur, sous un nom neutre. La consigne de sécurité
      // l'empêche de charger quoi que ce soit d'autre ou d'être affiché dans une page d'un autre site.
      ...(pdf && {
        "Content-Disposition": 'inline; filename="document.pdf"',
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
      }),
    },
  });
}
