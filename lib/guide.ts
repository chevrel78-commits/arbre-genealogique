// Petit lecteur du guide : seulement ce que le guide utilise (titres, paragraphes, listes, gras).
export type Bloc = { type: "p"; texte: string } | { type: "ul" | "ol"; items: string[] };
export type Rubrique = { id: string; titre: string; blocs: Bloc[] };

export const RUBRIQUE_ADMIN = "Pour les administrateurs";

const ancre = (titre: string) =>
  titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function lireGuide(texte: string): { introduction: Bloc[]; rubriques: Rubrique[] } {
  const introduction: Bloc[] = [];
  const rubriques: Rubrique[] = [];
  let blocs = introduction;
  let ouvert: Bloc | null = null;

  const ouvrir = (bloc: Bloc) => {
    blocs.push(bloc);
    ouvert = bloc;
  };
  const courant = () => ouvert as Bloc | null;

  for (const ligne of texte.split("\n")) {
    const titre = /^## (.+)$/.exec(ligne);
    const puce = /^- (.+)$/.exec(ligne);
    const numero = /^\d+\. (.+)$/.exec(ligne);
    const bloc = courant();

    if (ligne.startsWith("# ")) continue;
    if (titre) {
      blocs = [];
      rubriques.push({ id: ancre(titre[1]), titre: titre[1], blocs });
      ouvert = null;
    } else if (ligne.trim() === "") {
      ouvert = null;
    } else if (puce || numero) {
      const type = puce ? "ul" : "ol";
      const contenu = (puce ?? numero)![1];
      if (bloc?.type === type) bloc.items.push(contenu);
      else ouvrir({ type, items: [contenu] });
    } else if (bloc && bloc.type !== "p") {
      // Suite d'un élément de liste écrit sur plusieurs lignes.
      bloc.items[bloc.items.length - 1] += ` ${ligne.trim()}`;
    } else if (bloc?.type === "p") {
      bloc.texte += ` ${ligne.trim()}`;
    } else {
      ouvrir({ type: "p", texte: ligne.trim() });
    }
  }
  return { introduction, rubriques };
}
