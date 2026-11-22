// Textes des e-mails envoyés aux membres et aux administrateurs (l'envoi lui-même est dans lib/email.ts).
// Un e-mail qui ne part pas ne doit pas bloquer l'action : l'échec est noté dans le journal (JournalEmail)
// et dans le journal du serveur.
import { envoyerEmail, urlSite } from "./email";
import { prisma } from "./prisma";

const SIGNATURE = "\n\n—\nArbre généalogique de la famille\n(e-mail automatique, merci de ne pas y répondre)";

async function envoyerSansBloquer(a: string, sujet: string, texte: string, type: string) {
  try {
    await envoyerEmail({ a, sujet, texte: texte + SIGNATURE, type });
    return true;
  } catch (e) {
    console.error(`E-mail « ${type} » à ${a} non envoyé`, e);
    return false;
  }
}

type Personne = { prenom: string; nom: string; email: string };

export async function emailDemandeRecue(m: Personne) {
  await envoyerSansBloquer(
    m.email,
    "Votre demande d'accès à l'arbre généalogique",
    `Bonjour ${m.prenom},\n\nNous avons bien reçu votre demande d'accès à l'arbre généalogique de la famille.\n` +
      `Un administrateur va l'examiner. Vous recevrez un e-mail dès qu'elle sera acceptée.`,
    "DEMANDE_RECUE",
  );
}

// Prévient tous les administrateurs actifs qu'une demande attend.
export async function emailNouvelleDemande(m: Personne & { messageDemande: string | null }) {
  const admins = await prisma.membre.findMany({
    where: { statut: "ACCEPTE", OR: [{ admin: true }, { superAdmin: true }] },
    select: { email: true, prenom: true },
  });
  for (const admin of admins) {
    await envoyerSansBloquer(
      admin.email,
      `Nouvelle demande d'accès : ${m.prenom} ${m.nom}`,
      `Bonjour ${admin.prenom},\n\n${m.prenom} ${m.nom} (${m.email}) demande à accéder à l'arbre généalogique.\n` +
        (m.messageDemande ? `\nSon message : « ${m.messageDemande} »\n` : "") +
        `\nPour accepter ou refuser : ${urlSite("/admin")}`,
      "NOUVELLE_DEMANDE",
    );
  }
}

export function emailAccesAccepte(m: Personne) {
  return envoyerSansBloquer(
    m.email,
    "Votre accès à l'arbre généalogique est accepté",
    `Bonjour ${m.prenom},\n\nBonne nouvelle : votre demande d'accès à l'arbre généalogique de la famille est acceptée.\n` +
      `Connectez-vous avec votre e-mail et le mot de passe choisi lors de la demande :\n${urlSite("/connexion")}`,
    "ACCES_ACCEPTE",
  );
}

export function emailAccesRefuse(m: Personne) {
  return envoyerSansBloquer(
    m.email,
    "Réponse à votre demande d'accès à l'arbre généalogique",
    `Bonjour ${m.prenom},\n\nVotre demande d'accès à l'arbre généalogique de la famille n'a pas été acceptée.\n` +
      `Si vous pensez qu'il s'agit d'une erreur, contactez directement un membre de la famille.`,
    "ACCES_REFUSE",
  );
}

// Quelqu'un refait une demande avec l'adresse d'un compte déjà actif : on prévient le titulaire (lui seul
// lit cet e-mail, donc le site ne révèle rien à celui qui a rempli le formulaire).
export async function emailCompteDejaExistant(m: Personne) {
  await envoyerSansBloquer(
    m.email,
    "Vous avez déjà un compte sur l'arbre généalogique",
    `Bonjour ${m.prenom},\n\nUne demande d'accès vient d'être faite avec votre adresse, mais vous avez déjà un compte.\n` +
      `Connectez-vous ici : ${urlSite("/connexion")}\n` +
      `Mot de passe perdu ? Choisissez-en un nouveau ici : ${urlSite("/mot-de-passe-oublie")}`,
    "COMPTE_EXISTANT",
  );
}

export async function emailMotDePasse(m: Personne, jeton: string) {
  await envoyerSansBloquer(
    m.email,
    "Choisir un nouveau mot de passe",
    `Bonjour ${m.prenom},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure, une seule fois) :\n` +
      `${urlSite(`/nouveau-mot-de-passe?jeton=${jeton}`)}\n\n` +
      `Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe actuel reste valable.`,
    "MOT_DE_PASSE",
  );
}
