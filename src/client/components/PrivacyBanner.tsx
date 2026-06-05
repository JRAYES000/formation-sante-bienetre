import { useState } from "react";

// Bandeau informatif RGPD. État en mémoire (pas de localStorage) : réapparaît au rechargement.
export default function PrivacyBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-hairline shadow-airbnb" data-testid="privacy-banner">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between text-sm">
        <p className="text-body">
          Nous n'utilisons que les éléments nécessaires au fonctionnement du site (aucun traçage publicitaire). En
          poursuivant, vous acceptez notre{" "}
          <a href="/politique-confidentialite" className="text-primary underline">politique de confidentialité</a>.
        </p>
        <button onClick={() => setHidden(true)} className="btn-primary !py-2 shrink-0" data-testid="button-privacy-ok">
          J'ai compris
        </button>
      </div>
    </div>
  );
}
