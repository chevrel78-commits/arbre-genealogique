// Dessine la première page d'un PDF dans le navigateur, avec pdf.js (la bibliothèque de Mozilla qui affiche
// les PDF dans Firefox). Chargée seulement quand on ajoute un document : le reste du site n'en paie pas le poids.
// Renvoie une image JPEG, ou null si le fichier ne se laisse pas dessiner (PDF abîmé, protégé par mot de passe…).
const COTE_APERCU = 1600;

export async function apercuPdf(fichier: File): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // Le travail lourd se fait dans un « worker », à part, pour ne pas figer la page.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    // pdf.js n'exécute pas les scripts qu'un PDF peut contenir : il ne fait que dessiner la page.
    const chargement = pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) });
    try {
      const document = await chargement.promise;
      const page = await document.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const vue = page.getViewport({ scale: Math.min(4, COTE_APERCU / Math.max(base.width, base.height)) });
      const toile = window.document.createElement("canvas");
      toile.width = Math.max(1, Math.floor(vue.width));
      toile.height = Math.max(1, Math.floor(vue.height));
      const contexte = toile.getContext("2d");
      if (!contexte) return null;
      contexte.fillStyle = "#fff"; // fond des pages sans couleur de fond
      contexte.fillRect(0, 0, toile.width, toile.height);
      await page.render({ canvas: toile, canvasContext: contexte, viewport: vue }).promise;
      return await new Promise((resoudre) => toile.toBlob(resoudre, "image/jpeg", 0.9));
    } finally {
      await chargement.destroy(); // libère la mémoire et arrête le worker
    }
  } catch (e) {
    console.error("Aperçu du PDF impossible :", e instanceof Error ? e.message : e);
    return null;
  }
}
