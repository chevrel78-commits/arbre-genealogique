// Lien vers le support, avec une icône enveloppe : ouvre la messagerie de la personne.
export const EMAIL_SUPPORT = "support@altea.website";
const LIEN = `mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent("Arbre généalogique : demande d'aide")}`;

function Enveloppe() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

// `compact` : l'icône seule, pour le bandeau ; sinon l'icône et l'adresse.
export function LienSupport({ compact = false }: { compact?: boolean }) {
  if (compact)
    return (
      <a href={LIEN} title={`Contacter le support : ${EMAIL_SUPPORT}`} aria-label={`Contacter le support : ${EMAIL_SUPPORT}`} className="rounded-lg p-2 text-arbre hover:bg-arbre-doux">
        <Enveloppe />
      </a>
    );
  return (
    <a href={LIEN} className="inline-flex items-center gap-2 text-sm text-arbre underline">
      <Enveloppe />
      {EMAIL_SUPPORT}
    </a>
  );
}
