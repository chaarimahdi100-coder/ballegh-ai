# Ballegh AI (بلّغ) — Plateforme Civique & Municipale Intelligente

[![Live Demo](https://img.shields.io/badge/Demo_En_Ligne-balleghai.vercel.app-00B4D8?style=for-the-badge&logo=vercel)](https://balleghai.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.28-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75C2?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)

> 🌐 **Accès direct à la plateforme en ligne :** [https://balleghai.vercel.app](https://balleghai.vercel.app)

---

## 🏛️ Présentation du Projet

**Ballegh AI (بلّغ)** est une plateforme Civic-Tech innovante conçue pour la **Commune de Tunis**. Elle transforme les signalements d'incidents urbains émis par les citoyens en informations structurées, géolocalisées et priorisées grâce à la vision par ordinateur et à l'intelligence artificielle générative (Google Gemini), sous **contrôle humain systématique et obligatoire** des agents municipaux.

La plateforme se concentre sur **3 priorités d'infrastructure urbaine** :
- 🕳️ **Nids-de-poule & Chaussée dégradée** : Détection des trous dangereux, affaissements et fissures menaçant la sécurité routière.
- 💡 **Éclairage Public Défaillant** : Signalement des lampadaires hors service et réverbères dégradés pour lutter contre l'insécurité nocturne.
- 🌊 **Inondations & Eaux Pluviales** : Détection des bouches d'égout obstruées et accumulations d'eaux pluviales bloquant la voirie.

---

## 🚪 Les 3 Espaces Utilisateurs Dédiés

Ballegh AI propose une architecture claire et hermétiquement isolée en **trois portails métiers distincts** :

### 1. 👥 Espace Citoyen
- **Accès :** Public ([`https://balleghai.vercel.app/login?portal=citizen`](https://balleghai.vercel.app/login?portal=citizen)) ou création de compte immédiate ([`/register`](https://balleghai.vercel.app/register)).
- **Fonctionnalités :**
  - **Signalement rapide et intuitif :** Prise de photo sur le terrain, géolocalisation automatique et choix de l'arrondissement à Tunis.
  - **Diagnostic instantané par l'IA :** Pré-classification du type d'incident, estimation de sévérité (1 à 3) et score de priorité.
  - **Suivi en temps réel :** Chronologie interactive des étapes de traitement (`Reçu` ➔ `Analysé par l'IA` ➔ `Validé par l'agent` ➔ `Transmis` ➔ `Intervention en cours` ➔ `Résolu`).
  - **Confirmation citoyenne de clôture :** Le citoyen valide sur le terrain la bonne exécution des travaux municipaux.
  - **Espace Profil :** Consultation des informations de compte et gestion de la session.

### 2. 🏢 Espace Municipal (Agents & Services Techniques)
- **Accès :** Réservé aux agents communaux habilités ([`https://balleghai.vercel.app/login?portal=municipal`](https://balleghai.vercel.app/login?portal=municipal)).
- **Fonctionnalités :**
  - **File de traitement intelligente :** Signalements classés et priorisés par gravité pour un traitement optimal des urgences.
  - **Revue et validation humaine obligatoire :** L'agent municipal inspecte le diagnostic de l'IA, valide, modifie ou rejette le dossier (aucune décision automatique n'est prise sans approbation humaine).
  - **Carte interactive des incidents :** Vue cartographique en temps réel de tous les incidents signalés sur le Grand Tunis avec filtres par catégorie.
  - **Transmission officielle :** Génération et expédition d'e-mails officiels standardisés aux services techniques compétents.
  - **Espace Profil Agent :** Gestion du profil technique et rattachement administratif.

### 3. 🛡️ Espace Administration (Direction & DSI)
- **Accès :** Haute sécurité réservé aux administrateurs système ([`https://balleghai.vercel.app/login?portal=admin`](https://balleghai.vercel.app/login?portal=admin)).
- **Fonctionnalités :**
  - **Tableau de bord de gouvernance :** Indicateurs clés de performance (KPIs), taux de résolution et temps moyen de traitement.
  - **Gestion des utilisateurs & des rôles (RBAC) :** Création et provisionnement sécurisé de nouveaux comptes agents municipaux et administrateurs.
  - **Supervision consolidée :** Vue globale de tous les signalements communaux sur l'ensemble des arrondissements.
  - **Paramètres de la plateforme & IA :** Réglage des seuils de confiance IA, rayons de détection des doublons et modèles d'analyse.
  - **Espace Profil Administrateur :** Paramètres et supervision du système.

---

## 🔒 Sécurité & Contrôle d'Accès (RBAC)

- **Principe du moindre privilège :** Les citoyens n'ont aucun accès aux données d'administration ni aux signalements privés d'autrui.
- **Protection par Middleware :** Toutes les routes (`/citizen/*`, `/municipal/*`, `/admin/*`) sont protégées au niveau du serveur Next.js avec vérification cryptographique des jetons JWT (HS256).
- **Protection contre le Cross-Role :** L'interface de connexion détecte les incompatibilités de rôle et bloque toute tentative d'accès non autorisé avec un message d'accès refusé explicite.
- **Inscription publique sécurisée :** Le formulaire d'inscription citoyen force immuablement le rôle `CITIZEN` pour interdire toute élévation de privilèges.
- **Stockage d'images privé :** Les photos d'incidents sont stockées dans un bucket Supabase Storage privé avec contrôle d'accès au niveau des API routes.
- **Base de données PostgreSQL Durcie :** Activation de RLS (Row Level Security) sur l'ensemble des tables applicatives.

---

## 🛠️ Stack Technologique

| Composant | Technologie |
| :--- | :--- |
| **Framework Fullstack** | [Next.js 15](https://nextjs.org) (App Router, Server Actions, React 19) |
| **Langage** | [TypeScript](https://www.typescriptlang.org) (typage strict de bout en bout) |
| **Styles & UI** | [Tailwind CSS](https://tailwindcss.com), [Lucide React](https://lucide.dev) |
| **Base de Données** | [PostgreSQL](https://www.postgresql.org) managé sur [Supabase](https://supabase.com) |
| **ORM** | [Prisma 6.4](https://www.prisma.io) |
| **Stockage Fichiers** | Supabase Storage (Bucket privé sécurisé) |
| **Intelligence Artificielle** | [Google Gemini Vision API](https://ai.google.dev) |
| **Internationalisation** | Support bilingue complet Français / Arabe avec support natif RTL |
| **Déploiement Cloud** | [Vercel](https://vercel.com) |

---

## 🚀 Installation & Développement Local

### Prérequis
- Node.js 18+ ou 20+
- npm ou yarn
- Instance PostgreSQL (locale ou projet Supabase)

### 1. Cloner le dépôt
```bash
git clone https://github.com/chaarimahdi100-coder/ballegh-ai.git
cd ballegh-ai
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Copiez le fichier d'exemple et renseignez vos clés d'API :
```bash
cp .env.example .env.local
```

Variables requises dans `.env.local` :
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[VOTRE_CLE_SERVICE_ROLE]"
GEMINI_API_KEY="[VOTRE_CLE_GOOGLE_GEMINI]"
GEMINI_MODEL="gemini-2.5-flash"
AUTH_SECRET="[SECRET_JWT_MINIMUM_32_CARACTERES]"
ALLOW_DEMO_SWITCH="false"
```

### 4. Initialiser la base de données
```bash
npx prisma generate
npx prisma db push
```

### 5. Lancer le serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour tester la sélection des espaces.

### 6. Compiler pour la production
```bash
npm run lint
npm run build
```

---

## 📜 Éthique Civique & IA Responsable

1. **L'IA propose, l'humain décide :** Aucun agent algorithmique ne valide ou ne clôture de signalement de manière autonome. Chaque décision est validée par un agent communal assermenté.
2. **Protection de la vie privée :** Respect des données personnelles des citoyens conformément aux standards de protection des données.
3. **Optimisation des ressources publiques :** Détection intelligente des doublons pour désengorger les services techniques municipaux.

---

## 📄 Licence
Ce projet est développé dans un cadre académique et professionnel d'innovation civique eBusiness pour la Ville de Tunis.  
Tous droits réservés © 2026 Ballegh AI.
