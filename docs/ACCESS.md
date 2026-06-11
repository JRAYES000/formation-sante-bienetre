# Registre des accès — formation-sante-bienetre

> **Aucun secret dans ce fichier.** Il liste *quelles* briques existent, *comment* l'accès est accordé et *où* trouver les secrets (NordPass). Les valeurs (mots de passe, clés API, tokens) vivent **uniquement** dans le coffre NordPass partagé du projet et dans les variables Railway.

Dernière mise à jour : _(à dater à chaque changement)_

## Briques & mode d'accès

| Brique | Usage | Type d'accès accordé | Secret dans NordPass ? |
|---|---|---|---|
| **GitHub** `JRAYES000/formation-sante-bienetre` | code source | Invitation collaborateur (write) | Non (auth perso GitHub) |
| **Railway** projet *gallant-courage* / *production* | hébergement, env vars, logs, console, volume `/app/data` | Invitation membre du projet | Non (auth perso Railway) |
| **Hostinger** | domaine + DNS `formation-sante-bienetre.fr` | Accès partagé / délégué | Identifiants Hostinger → NordPass si délégué |
| **Mailjet** | emails transactionnels (leads, newsletter) | Clés API | **Oui** : `MAILJET_API_KEY`, `MAILJET_API_SECRET` |
| **Back-office admin** | `/#/admin` (leads, export CSV) | Token applicatif | **Oui** : `ADMIN_TOKEN` |
| **Google Search Console** | indexation + perfs SEO | Utilisateur GSC (après vérif propriété) | Non (auth Google) |
| **IndexNow** | ping Bing/Yandex | Clé publique (dans le code) | Non (publique par design) |
| **Analytics** (Plausible/GA4) | mesure trafic | _à créer (voir ONBOARDING §5)_ | selon outil |

## Variables d'environnement de prod (Railway)

Liste des clés attendues (valeurs côté Railway / NordPass, **jamais ici**) :
`PORT` · `PUBLIC_URL` · `ADMIN_TOKEN` · `INGEST_INTERVAL_HOURS` · `MAILJET_API_KEY` · `MAILJET_API_SECRET` · `MAIL_FROM` · `MAIL_FROM_NAME` · `INDEXNOW_KEY` · `INDEXNOW_HOST` · `DB_DRIVER` · `SQLITE_PATH`.

## Procédure de départ d'un collaborateur (offboarding)

1. GitHub → retirer des *Collaborators*.
2. Railway → retirer des *Members*.
3. Google Search Console → retirer des *Utilisateurs*.
4. Hostinger → révoquer l'accès délégué.
5. NordPass → arrêter le partage du coffre projet.
6. **Faire tourner** les secrets potentiellement exposés : régénérer `ADMIN_TOKEN` (+ MAJ Railway) et **régénérer les clés Mailjet**.
