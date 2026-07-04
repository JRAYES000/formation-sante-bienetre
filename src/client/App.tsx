import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Resultats from "./pages/Resultats";
import FicheFormation from "./pages/FicheFormation";
import FicheOrganisme from "./pages/FicheOrganisme";
import Admin from "./pages/Admin";
import Comparer from "./pages/Comparer";
import { CompareProvider, CompareBar } from "./lib/compare";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import PrivacyBanner from "./components/PrivacyBanner";

export default function App() {
  return (
    <CompareProvider>
      <Router hook={useHashLocation}>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Switch>
              <Route path="/">{() => { window.location.replace("/"); return null; }}</Route>
              <Route path="/recherche" component={Resultats} />
              <Route path="/recherche/:q" component={Resultats} />
              <Route path="/recherche/:q/:dept" component={Resultats} />
              <Route path="/categorie/:slug" component={Resultats} />
              <Route path="/formation/:numero" component={FicheFormation} />
              <Route path="/organisme/:siret" component={FicheOrganisme} />
              <Route path="/comparer" component={Comparer} />
              <Route path="/admin" component={Admin} />
              <Route>
                <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">Page introuvable.</div>
              </Route>
            </Switch>
          </main>
          <SiteFooter />
          <CompareBar />
          <PrivacyBanner />
        </div>
      </Router>
    </CompareProvider>
  );
}
