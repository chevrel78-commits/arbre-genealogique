// Seul module qui envoie des e-mails (nodemailer, serveur SMTP de l'hébergement). Pour changer de service
// d'envoi, ne modifier que ce fichier.
// Réglages (variables d'environnement) : SMTP_HOTE, SMTP_PORT, SMTP_UTILISATEUR, SMTP_MOT_DE_PASSE,
// EMAIL_EXPEDITEUR et URL_SITE (adresse du site, pour les liens).
// Sans SMTP_HOTE (développement), l'e-mail n'est pas envoyé : son contenu est écrit dans le journal du serveur.
// Chaque envoi est noté dans la table JournalEmail (type, destinataire, résultat ; jamais le contenu).
import nodemailer from "nodemailer";
import type { StatutEmail } from "../generated/prisma/enums";
import { prisma } from "./prisma";

// `type` : nature de l'e-mail pour le journal (ex. « CONFIRMATION », « MOT_DE_PASSE »).
type Message = { a: string; sujet: string; texte: string; type: string };

// Le journal ne doit jamais empêcher un envoi : une erreur d'écriture est seulement signalée.
async function noter(type: string, destinataire: string, statut: StatutEmail, erreur?: string) {
  await prisma.journalEmail
    .create({ data: { type, destinataire: destinataire.slice(0, 255), statut, erreur: erreur?.slice(0, 500) ?? null } })
    .catch((e) => console.error("Journal des e-mails : écriture impossible", e));
}

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

function transporteur() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOTE,
      port,
      // Port 465 : connexion chiffrée d'emblée ; 587 : STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_UTILISATEUR, pass: process.env.SMTP_MOT_DE_PASSE },
    });
  }
  return transport;
}

// Adresse absolue d'une page du site, pour les liens envoyés par e-mail.
export function urlSite(chemin: string) {
  const base = (process.env.URL_SITE ?? "http://localhost:3000").replace(/\/+$/, "");
  return base + chemin;
}

export async function envoyerEmail({ a, sujet, texte, type }: Message) {
  if (!process.env.SMTP_HOTE) {
    console.log(`[e-mail non envoyé : SMTP non configuré]\nÀ : ${a}\nSujet : ${sujet}\n\n${texte}\n`);
    await noter(type, a, "SIMULE");
    return;
  }
  try {
    await transporteur().sendMail({
      from: process.env.EMAIL_EXPEDITEUR ?? process.env.SMTP_UTILISATEUR,
      to: a,
      subject: sujet,
      text: texte,
    });
  } catch (e) {
    await noter(type, a, "ECHEC", e instanceof Error ? e.message : String(e));
    throw e;
  }
  await noter(type, a, "ENVOYE");
}
