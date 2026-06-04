import { Router, Route, Switch, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Home from "./pages/Home";
import Resultats from "./pages/Resultats";
import FicheFormation from "./pages/FicheFormation";
import FicheOrganisme from "./pages/FicheOrganisme";
import Admin from "./pages/Admin";

function Header() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary text-lg" data-testid="link-home">
          <span className="text-2xl">🌿</span> Formation Santé Bien-être
        </Link>
        <nav className="text-sm text-gray-600">
          <Link href="/recherche" className="hover:text-primary" data-testid="link-recherche">
            Toutes les formations
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500 space-y-2">
        <p className="font-semibold text-dark">Formation Santé Bien-être</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-1">
          <a href="/financement-cpf" className="hover:text-primary" data-testid="link-cpf">Financement CPF</a>
          <a href="/formations" className="hover:text-primary" data-testid="link-toutes-formations">Toutes les formations</a>
        </nav>
        <p>
          Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins.
          Données issues du catalogue public Mon Compte Formation.
        </p>
        <p className="text-xs">
          Les demandes d'information sont transmises à des organismes partenaires avec votre consentement (RGPD).
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/recherche" component={Resultats} />
            <Route path="/recherche/:q" component={Resultats} />
            <Route path="/categorie/:slug" component={Resultats} />
            <Route path="/formation/:numero" component={FicheFormation} />
            <Route path="/organisme/:siret" component={FicheOrganisme} />
            <Route path="/admin" component={Admin} />
            <Route>
              <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">Page introuvable.</div>
            </Route>
          </Switch>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
