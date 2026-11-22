// Adresse IP du visiteur (derrière le serveur de Hostinger, elle arrive dans l'en-tête x-forwarded-for).
// Sert seulement à limiter les essais répétés.
import { headers } from "next/headers";

export async function adresseIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
}
