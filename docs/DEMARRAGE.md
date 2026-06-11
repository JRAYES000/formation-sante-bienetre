# 🚀 Démarrage — reprendre le projet `formation-sante-bienetre`

Guide **pas à pas** pour être opérationnel (~20 min). Tu as déjà **Claude Code** et **Claude Desktop** :
l'objectif est de te connecter aux accès, récupérer le code, et **l'ouvrir dans Claude Code** — qui lira
[`CLAUDE.md`](../CLAUDE.md) automatiquement et saura tout du projet.

Coche au fur et à mesure ✅.

---

## 0. Prérequis (à installer une fois)

- [ ] **Node.js LTS (≥ 20)** → https://nodejs.org — vérifie avec `node -v`
- [ ] **Git** → https://git-scm.com — vérifie avec `git -v`
- [ ] **Claude Code** → tu l'as déjà ✅
- [ ] Comptes : **GitHub**, **Google** (pour Search Console), **NordPass** (la version gratuite suffit pour recevoir les secrets partagés)

---

## 1. Accepter les accès (Julien te les envoie)

Tu vas recevoir des invitations par email — accepte-les **toutes** :

- [ ] **GitHub** — invitation comme *collaborateur* du repo `JRAYES000/formation-sante-bienetre` (clique le lien dans l'email GitHub, ou va sur le repo et accepte).
- [ ] **Railway** — invitation comme *membre* du projet (hébergement : variables, logs, déploiements).
- [ ] **Google Search Console** — tu es ajouté comme *utilisateur* (suivi SEO, indexation, requêtes).
- [ ] **NordPass** — partage du **coffre du projet** : il contient les secrets (clés Mailjet, `ADMIN_TOKEN`…).
- [ ] **Hostinger** (DNS du domaine) — seulement si Julien te le délègue ; sinon il gère le DNS.

> 🔐 **On ne s'échange jamais de secret en clair** (mail, WhatsApp, Slack). Tout passe par le coffre NordPass.

---

## 2. Récupérer le code

```bash
git clone https://github.com/JRAYES000/formation-sante-bienetre.git
cd formation-sante-bienetre
```

---

## 3. Configurer l'environnement local

```bash
cp .env.example .env      # (Windows PowerShell : Copy-Item .env.example .env)
```

Ouvre `.env` et renseigne les valeurs depuis le **coffre NordPass**. Pour le **dev local** :
- `ADMIN_TOKEN` : mets n'importe quelle chaîne (sert au back-office `/#/admin`).
- `MAILJET_*` : **optionnel** en local — sans, les emails sont simplement loggés dans la console.

> ⚠️ Ne committe **jamais** `.env` (il est déjà ignoré par git).

---

## 4. Installer et lancer

```bash
npm install
npm run ingest        # remplit la base locale (~2 100 formations — télécharge le catalogue public, ~1 min)
```

Puis, dans **2 terminaux séparés** :

```bash
npm run serve         # Terminal 1 — API + pages SEO → http://localhost:3001/formations
npm run web           # Terminal 2 — interface React → http://localhost:5173
```

Ouvre **http://localhost:3001/formations** : si tu vois les pages, tout fonctionne 🎉

---

## 5. Ouvrir le projet dans Claude Code

Dans le dossier du projet, lance :

```bash
claude
```

Claude Code lit automatiquement **`CLAUDE.md`** (architecture + règles SEO). Pour démarrer, tu peux lui demander :

> *« Lis CLAUDE.md, ONBOARDING.md et README.md, puis résume-moi le projet et explique-moi où vit le SEO. »*

---

## 6. Comprendre l'essentiel (5 min de lecture)

| Fichier | À quoi ça sert |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Architecture + règles (lu par l'IA) |
| [`ONBOARDING.md`](../ONBOARDING.md) | Vue d'ensemble, où travailler |
| [`README.md`](../README.md) | Historique technique du projet |
| [`docs/ACCESS.md`](ACCESS.md) | Qui a accès à quoi |

**Les 2 règles d'or à retenir :**

1. **Le SEO vit dans les pages SSR Express** ([`src/server/seo.ts`](../src/server/seo.ts)) — **pas** dans le React. La SPA est en *hash routing*, donc invisible pour Google. Toute page à référencer = une route Express qui renvoie du HTML complet.
2. **`master` = production** (déploiement automatique sur Railway). On travaille sur une **branche** + **Pull Request**, **jamais** en direct sur `master`.

---

## 7. Ta première contribution (pour tester la boucle)

```bash
git checkout -b seo/mon-premier-changement
# … fais une petite modif (ex : corriger un texte dans src/server/seo.ts) …
npm run check         # typecheck — doit passer sans erreur
git commit -m "seo: petit ajustement de test"
git push -u origin seo/mon-premier-changement
```

Ouvre ensuite une **Pull Request** sur GitHub. Une fois mergée dans `master`, **Railway déploie tout seul**.

---

## Besoin d'aide ?

- Sur le code/projet : demande directement à **Claude Code** dans le dossier (il a tout le contexte).
- Sur les accès / les secrets : contacte **Julien**.
