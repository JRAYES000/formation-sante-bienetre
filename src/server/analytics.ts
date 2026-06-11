// Mesure d'audience GA4 — chargée UNIQUEMENT après consentement explicite (CNIL).
// Tout est piloté par la variable d'env GA4_MEASUREMENT_ID :
//   - non définie  → /analytics.js renvoie un no-op, aucun bandeau, aucun cookie.
//   - définie      → bandeau de consentement ; GA4 ne se charge qu'après "Accepter".
// Le même script est référencé par les pages SSR (seo.ts) ET la SPA (index.html),
// servis sur la même origine Express → une seule source de vérité.
import { Router } from "express";

export function gaId(): string {
  return (process.env.GA4_MEASUREMENT_ID ?? "").trim();
}

// Construit le JS servi à /analytics.js. `id` est injecté via JSON.stringify (sûr).
function buildAnalyticsJs(id: string): string {
  return `;(function(){
  var GA_ID=${JSON.stringify(id)};
  if(!GA_ID)return;
  var KEY="fsb_consent";
  function get(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function set(v){try{localStorage.setItem(KEY,v)}catch(e){}}
  function loadGA(){
    if(window.__fsbGA)return;window.__fsbGA=true;
    var s=document.createElement("script");s.async=true;
    s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag("js",new Date());
    window.gtag("config",GA_ID);
  }
  function close(){var b=document.getElementById("fsb-consent");if(b&&b.parentNode)b.parentNode.removeChild(b)}
  function accept(){set("granted");close();loadGA()}
  function refuse(){set("denied");close()}
  function banner(){
    if(document.getElementById("fsb-consent"))return;
    var w=document.createElement("div");
    w.id="fsb-consent";
    w.setAttribute("role","dialog");
    w.setAttribute("aria-live","polite");
    w.setAttribute("aria-label","Mesure d’audience");
    w.style.cssText="position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;max-width:560px;margin:0 auto;background:#fff;color:#222;border:1px solid #ddd;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:16px 18px;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:.92rem;line-height:1.45";
    w.innerHTML='<p style="margin:0 0 12px">Nous utilisons des cookies de <strong>mesure d’audience</strong> (Google Analytics) pour améliorer le site. Vous pouvez accepter ou refuser. <a href="/politique-confidentialite" style="color:#186749">En savoir plus</a>.</p><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button id="fsb-refuse" type="button" style="cursor:pointer;border:1px solid #ddd;background:#fff;color:#222;border-radius:8px;padding:9px 16px;font:inherit">Refuser</button><button id="fsb-accept" type="button" style="cursor:pointer;border:0;background:#186749;color:#fff;border-radius:8px;padding:9px 16px;font:inherit;font-weight:600">Accepter</button></div>';
    document.body.appendChild(w);
    document.getElementById("fsb-accept").onclick=accept;
    document.getElementById("fsb-refuse").onclick=refuse;
  }
  var c=get();
  if(c==="granted"){loadGA();return}
  if(c==="denied"){return}
  if(document.body){banner()}else{document.addEventListener("DOMContentLoaded",banner)}
})();
`;
}

export const analyticsRouter = Router();

analyticsRouter.get("/analytics.js", (_req, res) => {
  res.type("application/javascript; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");
  const id = gaId();
  res.send(id ? buildAnalyticsJs(id) : "/* Mesure d'audience désactivée : GA4_MEASUREMENT_ID non défini. */\n");
});
