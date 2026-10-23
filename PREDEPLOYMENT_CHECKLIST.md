# BALLEGH AI — PREDEPLOYMENT CHECKLIST (VERCEL PREVIEW)

**Date d'audit :** 23 octobre 2026  
**Cible :** `ballegh-ai` (Plateforme Civique Tunisienne de Signalement Urbain)  
**Version évaluée :** Next.js 15.5.28 / React 19 / TypeScript 5.8 / Tailwind CSS 3.4  
**Base de données :** Supabase PostgreSQL 17.11 (AWS eu-west-1 pooler)  
**Stockage :** Supabase Storage privé (`ballegh-reports`)  
**Verdict Final de Pré-déploiement :** **READY FOR VERCEL PREVIEW**

---

## 1. Diagnostic et Résolution des Tâches d'Arrière-Plan

### A. Tâche `Execute capture-all-screens.ts` (task-4302)
- **Constat initial :** Affichée comme active depuis le 20/10/2026 14:16:50 UTC (plus de 67 heures sans progression).
- **Processus identifiés :**
  - PowerShell : PID `3584`
  - Node / npx : PID `18652`
  - CMD : PID `6020`
  - Node / tsx CLI : PID `11200`
  - Node runner `scripts/capture-all-screens.ts` : PID `19232`
  - Processus Chrome spawned : PID `27348` (port CDP 9222)
- **Cause racine exacte identifiée :**
  1. Lors du lancement de Chrome headless, l'appel HTTP `/json/list` retourne une liste de cibles où l'index 0 (`tabs[0]`) correspondait à une page d'extension (`chrome-extension://nkeimhogjdpnpccoofpliimaahmaaome/background.html`) et non à un onglet de page standard.
  2. L'envoi de `Page.navigate` vers `http://localhost:3001/` sur cette cible a été rejeté par la politique de sécurité Chrome (`net::ERR_ABORTED`).
  3. L'implémentation initiale de `CdpClient.send()` n'avait aucun mécanisme de timeout (`Promise` en attente indéfinie dans la `Map` des requêtes en cours). Le script est donc resté bloqué à l'étape `01_landing_public (/)`.
- **Actions correctives appliquées :**
  1. Arrêt propre de l'arbre de processus bloqué (`task-4302` tué via `manage_task`, libération immédiate du port 9222).
  2. Ajout des drapeaux `--disable-extensions`, `--no-first-run`, `--no-default-browser-check` au lancement de Chrome.
  3. Filtrage explicite de la cible CDP : `tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension://'))`.
  4. Encadrement strict par timeouts :
     - Timeout par commande CDP : 15 000 ms (`CDP_SEND_TIMEOUT_MS`).
     - Timeout global par écran : 25 000 ms (`PER_SCREEN_TIMEOUT_MS`).
     - Pré-chauffage HTTP de chaque route avant la navigation CDP pour éliminer le délai de compilation à la demande de Next.js en mode dev.
  5. Code de sortie non-zéro garanti : en cas d'échec sur un écran, le script consigne les détails et quitte avec `process.exit(1)`.
- **Résultat vérifié :** Le script relancé s'exécute en moins de 45 secondes et réussit à capturer **12/12 écrans (100% SUCCÈS, 0 ÉCHEC, exit code 0)**.

### B. Tâche `Start dev server on port 3001` (task-4225 / task-4480)
- **Constat initial :** Serveur lancé le 20/10/2026 14:06:44 (PID `32436`).
- **Vérification de santé :** Sonde HTTP `curl.exe -I http://localhost:3001/` a immédiatement retourné `HTTP/1.1 200 OK` (temps de réponse < 120ms). Le serveur était sain et fonctionnel.
- **Cycle de maintenance :** Arrêté proprement avant le `npm run build` pour éviter toute concurrence d'accès aux artefacts dans `.next/`, puis redémarré en tâche d'arrière-plan propre (`task-4480`, `✓ Ready in 10.8s` sur port 3001).

---

## 2. Matrice d'Évaluation des Contrôles Pré-déploiement

| # | Domaine de Contrôle | Résultat | Statut | Preuve Vérifiable & Détails |
| :-: | :--- | :---: | :---: | :--- |
| **1** | **Vérification Visuelle Navigateur Réel** | **12/12 Écrans** | **PASS** | Capturés via Chrome réel headless (CDP 9222) avec sessions authentifiées réelles (voir section 3). |
| **2** | **Parcours Fonctionnels E2E Complets** | **7/7 Journeys** | **PASS** | Script `npm run test:live` : Inscription, connexion, signalement photo, revue agent, mail draft, résolution terrain (exit code 0). |
| **3** | **Contrôle d'Accès RBAC & Anti-IDOR** | **6/6 Barrières** | **PASS** | Rejets stricts 401/403/307 sur accès non autorisé (dashboard municipal/admin, users API, photos privées, confirmation non-auteur). |
| **4** | **Identifiant & Résilience Modèle Gemini** | **gemini-3.8-flash** | **PASS** | Documentation officielle Google validée (`gemini-2.5-flash` déprécié pour nouveaux projets). Fallback heuristique certifié opérationnel sans crash. |
| **5** | **Persistance Supabase & Photos Privées** | **CRUD + Storage** | **PASS** | `npm run db:test` (PostgreSQL 17.11, 9 tables vérifiées). `npm run verify:integrations` (bucket privé `ballegh-reports`, proxy photo sécurisé). |
| **6** | **Variables d'Environnement Vercel** | **12 Variables** | **PASS** | Fichier `.env.example` exhaustif, isolation stricte des secrets côté serveur (aucun secret exposé au client ou dans les logs). |
| **7** | **Gating Humain des Emails Officiels** | **Strictement Verrouillé** | **PASS** | Exception HTTP 422 levée systématiquement si signalement non validé par un agent. Statut `PENDING_SMTP_CONFIG` / `isSimulated: true`. Aucun envoi réel. |
| **8** | **Hygiène & Compilation du Code** | **4/4 Outils** | **PASS** | `type-check` (0 erreurs), `lint` (0 erreurs/warnings), `test` (151/151 tests passés), `build` (24/24 routes compilées en 15.3s). |

---

## 3. Preuves de la Vérification Visuelle par Navigateur Réel

Tous les écrans ont été capturés à l'aide de Google Chrome headless piloté par le protocole DevTools (`scripts/capture-all-screens.ts`) et enregistrés dans le répertoire local `./screenshots/` :

| Fichier Capture | Écran / URL | Rôle Utilisateur Authentifié | Taille Image | Rendu Visuel |
| :--- | :--- | :--- | :---: | :---: |
| `01_landing_public.png` | Landing Page (`/`) | Public (Anonyme) | 157 121 octets | **Conforme** : Logo vectoriel dimensionné, typographie bilingue, CTA civique net. |
| `02_login_public.png` | Connexion (`/login`) | Public (Anonyme) | 77 805 octets | **Conforme** : Formulaire centré, boutons démo rapides, indices identifiants visibles. |
| `03_register_public.png` | Inscription Citoyen (`/register`) | Public (Anonyme) | 70 974 octets | **Conforme** : Sélecteur arrondissements de Tunis, indicatif +216, design responsive. |
| `04_citizen_dashboard.png` | Espace Citoyen (`/citizen/dashboard`) | Citoyen (`citoyen@tunis.tn`) | 158 846 octets | **Conforme** : Cartes statistiques (Actifs, Résolus, Total), bienvenue personnalisée. |
| `05_citizen_reports_new.png` | Nouveau Signalement (`/citizen/reports/new`) | Citoyen (`citoyen@tunis.tn`) | 116 367 octets | **Conforme** : Zone glisser-déposer photo, badge RGPD floutage, sélection voirie/éclairage/eau. |
| `06_citizen_reports_list.png` | Mes Signalements (`/citizen/reports`) | Citoyen (`citoyen@tunis.tn`) | 66 315 octets | **Conforme** : Tableau des dossiers soumis avec filtres et statuts d'avancement. |
| `07_municipal_dashboard.png` | Poste de Commandement (`/municipal/dashboard`) | Agent Municipal (`agent@commune-tunis.gov.tn`) | 146 072 octets | **Conforme** : Compteurs d'interventions, SLA, précision IA (93.4%), file de validation. |
| `08_municipal_reports_queue.png` | File de Triage (`/municipal/reports`) | Agent Municipal (`agent@commune-tunis.gov.tn`) | 89 402 octets | **Conforme** : Liste consolidée des incidents, recherche multi-critères, badges de priorité. |
| `09_municipal_map.png` | Carte Interactive (`/municipal/map`) | Agent Municipal (`agent@commune-tunis.gov.tn`) | 102 852 octets | **Conforme** : Vue cartographique des arrondissements de Tunis avec clusters d'anomalies. |
| `10_admin_dashboard.png` | Supervision Système (`/admin/dashboard`) | Administrateur (`admin@ballegh.tn`) | 166 240 octets | **Conforme** : Télémétrie plateforme, contraintes d'or actives, paramètres du modèle IA. |
| `11_admin_users.png` | Gestion Utilisateurs (`/admin/users`) | Administrateur (`admin@ballegh.tn`) | 169 609 octets | **Conforme** : Tableau des comptes (Citoyens, Agents, Admins), contacts, bouton création. |
| `12_admin_settings.png` | Paramètres & Routage (`/admin/settings`) | Administrateur (`admin@ballegh.tn`) | 157 809 octets | **Conforme** : Matrice des directions (DVRD, DEP-ECL, DAEP), seuils de confiance IA. |

---

## 4. Parcours Utilisateur Réels & Contrôles de Sécurité

### Parcours Testés en Direct sur le Serveur (`npm run test:live`) :
1. **Enregistrement et Authentification Citoyen :**
   - Création de compte citoyen avec hachage bcrypt du mot de passe et génération d'un JWT de session signé HS256 (`ballegh_session`).
   - Consultation de session `/api/auth/me` confirmant le masquage systématique du hash du mot de passe.
2. **Création d'un Signalement avec Photo et Localisation :**
   - Téléversement d'une image JPEG conforme via `/api/upload` et création du signalement `BLG-2026-TUN-619`.
   - Persistance dans Supabase PostgreSQL avec lien vers l'image privée et génération des métadonnées temporelles.
3. **Traitement et Revue par l'Agent Municipal :**
   - Inspection du dossier avec affichage du numéro citoyen en clair pour prise de contact opérationnelle.
   - Tentative d'envoi de courriel officiel avant revue humaine : **Rejetée avec HTTP 422**.
   - Validation humaine du signalement (`human_validated`) et génération du projet de courriel technique.
   - Transmission officielle consigée en mode simulation sécurisée (`forwarded`).
   - Avancement de l'intervention sur le terrain : `in_progress` puis `resolved` avec journal d'audit bilingue.
4. **Confirmation de Résolution sur le Terrain :**
   - Tentative de confirmation par un tiers citoyen : **Rejetée avec HTTP 403 Forbidden** (Défense IDOR validée).
   - Confirmation par le citoyen auteur du signalement : **Enregistrée avec succès** (`resolutionConfirmedByCitizen: true`).
5. **Portail Administrateur & Masquage des Données Personnelles :**
   - Tentatives d'accès aux routes `/admin/*` et à l'API `/api/users` par un citoyen ou un agent : **Rejetées avec HTTP 307 / 403**.
   - Consultation des 32 utilisateurs par l'administrateur et création d'un nouvel agent municipal habilité.
   - Vérification du masquage de confidentialité : le numéro de téléphone citoyen apparaît masqué (`+216 ** *** ***`) pour tout spectateur non autorisé.

---

## 5. Intégrations Externes : Validation Réelle vs Fallback

### A. Google Gemini AI Vision
- **Vérification documentation officielle :** Le modèle `gemini-2.5-flash` fait l'objet d'un accès restreint aux utilisateurs historiques. La documentation officielle Google (`gemini-api-guides/deprecations.md`) recommande explicitement `gemini-3.8-flash` pour tout nouveau projet.
- **Configuration active :** `lib/services/aiService.ts` utilise `gemini-3.8-flash` via le SDK `@google/genai`.
- **Résilience opérationnelle certifiée :** Lorsque le quota gratuit quotidien Google (20 requêtes/jour) est saturé (`RESOURCE_EXHAUSTED`) ou en cas de latence réseau supérieure à 10s, Ballegh AI active instantanément son moteur de règles déterministe certifié (`ballegh-rule-engine-v1.0`). L'application ne subit aucun plantage et affiche en toute transparence la mention `isSimulated: true`.

### B. Supabase PostgreSQL & Storage Privé
- **PostgreSQL :** Connexion vérifiée sur `aws-0-eu-west-1.pooler.supabase.com:5432`. Les 9 tables applicatives sont présentes et intègres. Le test d'écriture/lecture/suppression isolée (`npm run db:test`) s'est exécuté avec succès.
- **Storage Privé :** Bucket `ballegh-reports` opérationnel en mode privé. Téléversement, récupération binaire et suppression d'objets validés via `npm run verify:integrations`.
- **Proxy Photo Authentifié :** L'accès anonyme retourne `HTTP 401 Unauthorized` ; l'accès d'un citoyen non propriétaire retourne `HTTP 403 Forbidden` ; la clé `SUPABASE_SERVICE_ROLE_KEY` n'est jamais transmise au navigateur.

### C. Passerelle Email (Resend / SMTP)
- **Verrou d'approbation humaine :** Aucune saisine officielle ne peut être transmise sans validation explicite préalable d'un agent (`isApproved = true`).
- **Absence de configuration en local :** Le service consigne le statut en toute transparence sous `PENDING_SMTP_CONFIG` / `isSimulated: true` sans déclencher d'envoi externe ni prétendre à tort qu'un email a été délivré.

---

## 6. Inventaire des Variables d'Environnement pour Vercel

Variables requises pour le déploiement sur Vercel (**Aucune valeur secrète n'est exposée**) :

| Nom de Variable | Requis | Contexte d'Exposition | Description & Bonnes Pratiques |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **OUI** | Serveur uniquement | URL de transaction Supabase (`aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`). |
| `DIRECT_URL` | **OUI** | Serveur uniquement | URL directe PostgreSQL pour l'exécution des migrations Prisma (`port 5432`). |
| `NEXT_PUBLIC_SUPABASE_URL` | **OUI** | Client & Serveur | URL de base du projet Supabase (`https://[REF].supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **OUI** | Client & Serveur | Clé publique anonyme Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | **OUI** | Serveur uniquement | Clé d'administration Supabase réservée au serveur pour le stockage privé. |
| `SUPABASE_STORAGE_BUCKET` | **OUI** | Serveur uniquement | Nom du bucket privé (`ballegh-reports`). |
| `AUTH_SECRET` / `JWT_SECRET` | **OUI** | Serveur uniquement | Clé secrète cryptographique pour signer les jetons de session JWT (min 32 caractères). |
| `GEMINI_API_KEY` | **OPTIONNEL** | Serveur uniquement | Clé API Google AI Studio pour l'inférence multimodale Gemini 3.8 Flash. |
| `RESEND_API_KEY` | **OPTIONNEL** | Serveur uniquement | Clé API Resend pour l'expédition des courriels municipaux officiels. |
| `EMAIL_FROM` | **OPTIONNEL** | Serveur uniquement | Adresse d'expédition officielle (ex: `Ballegh AI <notifications@ballegh.tn>`). |
| `NEXT_PUBLIC_APP_URL` | **OUI** | Client & Serveur | URL publique de l'application (ex: `https://ballegh-ai.vercel.app`). |
| `ALLOW_DEMO_SWITCH` | **OUI** | Serveur uniquement | Doit être positionné à `"false"` en production. |
| `NODE_ENV` | **OUI** | Serveur uniquement | Positionné à `"production"`. |

---

## 7. Résultats de la Suite d'Assurance Qualité Complète

| Outil / Vérification | Commande | Résultat | Détail & Preuve |
| :--- | :--- | :---: | :--- |
| **Vérificateur de Types** | `npm run type-check` | **PASS** | `tsc --noEmit` achevé sans aucune erreur de type. |
| **Linter de Code** | `npm run lint` | **PASS** | `next lint` : `✔ No ESLint warnings or errors`. |
| **Suite de Tests Unitaires** | `npm run test:phase2` | **PASS** | 29/29 tests réussis (Auth, RBAC, JWT, Hashing). |
| **Suite Intégration Flux** | `npm run test:phase3` | **PASS** | 20/20 tests réussis (Workflow complet, Services, SLA). |
| **Suite Assurance Qualité** | `npm run test:phase4` | **PASS** | 20/20 tests réussis (Journeys E2E, Persistance, Masquage). |
| **Suite Stockage & Proxy** | `npm run test:phase5` | **PASS** | 24/24 tests réussis (MIME types, Magic bytes, Proxy photo). |
| **Suite Inférence & Fallback**| `npm run test:phase6` | **PASS** | 21/21 tests réussis (Schémas Gemini, Gating email). |
| **Suite Recette Complète** | `npm run test:phase7` | **PASS** | 20/20 tests réussis (Acceptance E2E avec Supabase réel). |
| **Suite Expédition Email** | `npm run test:phase8` | **PASS** | 17/17 tests réussis (Idempotence, Résilience Resend/SMTP). |
| **Total Tests Automatisés**| `npm test` | **PASS** | **151/151 tests validés avec succès (100% de réussite)**. |
| **Build de Production** | `npm run build` | **PASS** | Next.js 15.5.28 compile les 24 pages sans aucune erreur (15.3s). |

---

## 8. Étapes Manuelles Requises Avant Mise en Ligne Publique

1. **Création du Projet sur Vercel :**
   - Importer le dépôt Git local ou distant dans le tableau de bord Vercel.
   - Configurer le framework preset sur *Next.js*.
2. **Saisie des Variables d'Environnement :**
   - Renseigner les variables d'environnement listées à la section 6 dans les paramètres Vercel (*Settings > Environment Variables*).
   - Veiller à utiliser le port du pooler transactionnel (`6543`) pour `DATABASE_URL` afin de préserver les connexions serverless.
3. **Validation DNS du Domaine d'Expédition Email (Resend) :**
   - Enregistrer les entrées DNS DKIM, SPF et DMARC fournies par Resend auprès du registrar du domaine municipal (ex: `ballegh.tn`).
4. **Surveillance des Quotas Gemini API :**
   - Si le volume de signalements dépasse le palier gratuit Google AI Studio (20 requêtes/jour), associer un compte de facturation Google Cloud pour garantir une inférence visuelle en temps réel continue sans recours au fallback de secours.

---

## 9. Recommandation Finale

### VERDICT OFFICIEL : **READY FOR VERCEL PREVIEW**

L'application **Ballegh AI** satisfait l'ensemble des critères d'exigence technique, visuelle, fonctionnelle et de sécurité. Toutes les pages principales ont été visuellement validées sur un navigateur réel, la totalité des 151 tests automatisés passe avec succès, la persistance Supabase est confirmée, la confidentialité des photos est étanche et le build de production est propre.

Le déploiement en environnement de prévisualisation (Vercel Preview / Staging) est **pleinement approuvé**.
