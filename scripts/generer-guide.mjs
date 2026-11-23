// Copie le guide d'utilisation dans le code du site, avant le lancement ou la construction.
// Ainsi la page Aide ne dépend pas de la présence du dossier docs/ sur le serveur, et le guide reste le seul texte à tenir à jour.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const texte = readFileSync("docs/guide-utilisation.md", "utf8").replace(/\r\n/g, "\n");
mkdirSync("generated", { recursive: true });
writeFileSync("generated/guide.ts", `// Fichier créé par scripts/generer-guide.mjs : ne pas modifier.\nexport const TEXTE_GUIDE = ${JSON.stringify(texte)};\n`);
