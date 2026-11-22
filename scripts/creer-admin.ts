// Crée (ou remet en état) le compte du super-administrateur.
// Usage : npm run creer-admin   (la base visée est celle de DATABASE_URL, dans .env)
// Le mot de passe est tapé dans le terminal, sans s'afficher : il ne quitte jamais l'ordinateur
// autrement que sous forme d'empreinte scrypt.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Writable } from "node:stream";
import { prisma } from "../lib/prisma";
import { hacherMotDePasse, LONGUEUR_MINIMALE } from "../lib/mot-de-passe";

// Toutes les questions passent par une seule interface readline. Sa sortie passe par « ecran » :
// pendant la saisie d'un mot de passe, on la rend muette, donc les touches tapées ne s'affichent pas.
let muet = false;
const ecran = new Writable({
  write(morceau, encodage, suite) {
    if (!muet) stdout.write(morceau, encodage);
    suite();
  },
});
const rl = createInterface({ input: stdin, output: ecran, terminal: stdin.isTTY });

async function demander(question: string) {
  return (await rl.question(question)).trim();
}

async function demanderCache(question: string): Promise<string> {
  stdout.write(question);
  muet = true;
  try {
    return await rl.question("");
  } finally {
    muet = false;
    stdout.write("\n");
  }
}

async function principal() {
  const base = new URL(process.env.DATABASE_URL ?? "mysql://x@aucune/aucune").pathname.slice(1);
  console.log(`\nCréation du super-administrateur dans la base « ${base} ».\n`);

  const prenom = await demander("Prénom : ");
  const nom = await demander("Nom : ");
  const email = (await demander("E-mail : ")).toLowerCase();
  if (!prenom || !nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Prénom, nom ou e-mail invalide.");

  const mdp = await demanderCache(`Mot de passe (au moins ${LONGUEUR_MINIMALE} caractères, ne s'affiche pas) : `);
  if (mdp.length < LONGUEUR_MINIMALE) throw new Error(`Mot de passe trop court (minimum ${LONGUEUR_MINIMALE} caractères).`);
  if ((await demanderCache("Retapez le mot de passe : ")) !== mdp) throw new Error("Les deux mots de passe ne correspondent pas.");

  const existant = await prisma.membre.findUnique({ where: { email } });
  if (existant) {
    const ok = await demander("Un compte existe déjà avec cet e-mail. Le passer super-administrateur et changer son mot de passe ? (o/n) ");
    if (ok.toLowerCase() !== "o") throw new Error("Abandon : rien n'a été modifié.");
  }

  const donnees = {
    prenom,
    nom,
    motDePasseHash: await hacherMotDePasse(mdp),
    statut: "ACCEPTE" as const,
    admin: true,
    superAdmin: true,
    valideLe: new Date(),
  };
  await prisma.membre.upsert({ where: { email }, update: donnees, create: { email, ...donnees } });
  console.log(`\n✔ ${prenom} ${nom} (${email}) est super-administrateur. Vous pouvez vous connecter.\n`);
}

principal()
  .catch((e) => {
    console.error(`\n✘ ${e instanceof Error ? e.message : e}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
