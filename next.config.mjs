// Configuration en JavaScript (et non en TypeScript) : sur l'hébergement Hostinger, le compilateur
// natif de Next.js ne se charge pas (glibc trop ancienne), et sa version WebAssembly ne sait pas
// compiler un next.config.ts. Même choix que Palmares et Objectif.

/** @type {import("next").NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // proxy.ts relit chaque requête : au-delà de 10 Mo par défaut, le fichier serait tronqué sans erreur.
    proxyClientMaxBodySize: "11mb",
    serverActions: {
      // Envoi de photos jusqu'à 10 Mo (photos des personnes), plus une marge.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
