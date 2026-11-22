"use client";
// Bouton d'envoi qui demande une confirmation avant d'agir.
import type { ReactNode } from "react";

export function BoutonConfirme({ message, className, children }: { message: string; className: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
