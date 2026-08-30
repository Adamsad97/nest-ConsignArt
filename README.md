# ConsignArt

[![CI](https://github.com/Adamsad97/nest-ConsignArt/actions/workflows/ci.yml/badge.svg)](https://github.com/Adamsad97/nest-ConsignArt/actions/workflows/ci.yml)

Plateforme B2B de gestion de consignation d'œuvres d'art.  
Un artiste confie ses œuvres à une galerie, qui les expose et les vend moyennant commission.

Le projet comprend :
- une **API REST** (NestJS + PostgreSQL)
- une **interface web** (React + Vite)
- une suite de **tests E2E** (Cypress, 77 cas d'usage)

---

## Prérequis

Avant de commencer, vérifier que vous avez installé :

| Outil | Version minimale | Vérification |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | `docker --version` |
| [Node.js](https://nodejs.org/) | 20+ | `node --version` |
| Git | — | `git --version` |

> **Docker Desktop doit être lancé** avant toute commande `docker`.

---

## Lancer le projet (tout en une fois)

### 1. Cloner le dépôt

```bash
git clone https://github.com/Adamsad97/nest-ConsignArt.git
cd nest-ConsignArt
```

### 2. Créer le fichier d'environnement

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

> Les valeurs par défaut fonctionnent **sans aucune modification**.  
> Le compte admin est configuré via `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans ce fichier.

### 3. Démarrer tous les services

```bash
docker compose up --build
```

Cette commande construit et démarre en une seule fois :

| Service | URL |
|---|---|
| 🔌 API REST | http://localhost:3000/api/v1 |
| 📖 Swagger (doc interactive) | http://localhost:3000/api/docs |
| 🖥️ Frontend (interface web) | http://localhost:5173 |
| 🗄️ pgAdmin (base de données) | http://localhost:5050 |

> Premier démarrage : le schéma de base de données est créé automatiquement. Comptez ~30 secondes.

### 4. Créer le compte administrateur

Dans un **nouveau terminal** (pendant que Docker tourne) :

```bash
docker compose exec api npm run seed:admin
```

Cette commande crée le compte admin défini dans votre `.env`.  
**Elle est idempotente** : sans effet si le compte existe déjà.

Identifiants par défaut (valeurs du `.env.example`) :
- Email : `platform-admin@consignart.com`
- Mot de passe : `change_me_admin`

### 5. Ouvrir l'interface web

Aller sur **http://localhost:5173** et se connecter avec les identifiants admin ci-dessus.

---

## Lancer le frontend seul (sans Docker)

Si vous voulez développer le frontend en local avec hot-reload :

```bash
# Depuis la racine du projet
cd frontend
npm install
npm run dev
```

> ⚠️ L'API et la base de données doivent rester dans Docker (`docker compose up`).  
> Le frontend en local pointe automatiquement vers `http://localhost:3000`.

---

## Lancer les tests E2E (Cypress)

Les tests nécessitent que **Docker soit démarré** et que le **compte admin soit créé** (étapes 3 et 4).

```bash
cd frontend
npm install       # si pas encore fait
```

```bash
# Mode headless (terminal, résultats dans le terminal)
npm run cy:run

# Mode interactif (interface graphique Cypress)
npm run cy:open

# Une seule suite de tests
npx cypress run --spec "cypress/e2e/07-sales.cy.ts"
```

Les suites couvrent **77 cas d'usage** :

| Fichier | Contenu |
|---|---|
| `00-setup.cy.ts` | Santé API, seed admin |
| `01-auth.cy.ts` | Inscription, login, refresh, logout |
| `02-artworks-public.cy.ts` | Consultation publique des œuvres |
| `03-artists.cy.ts` | Gestion des artistes |
| `04-artworks-manage.cy.ts` | CRUD œuvres, changement de statut |
| `05-exhibitions.cy.ts` | Expositions |
| `06-loans.cy.ts` | Prêts |
| `07-sales.cy.ts` | Ventes et factures |
| `08-reports.cy.ts` | Rapports et dashboards |
| `09-access-control.cy.ts` | Contrôle d'accès par rôle |

---

## Lancer les tests unitaires

```bash
# Depuis la racine du projet
npm test
```

---

## Arrêter le projet

```bash
# Arrêter les conteneurs (les données sont conservées)
docker compose down

# Arrêter ET effacer toutes les données (repart à zéro)
docker compose down -v

# Nettoyage complet (conteneurs + volumes + images)
docker compose down -v --rmi all
```

---

## Inspecter la base de données

Ouvrir **pgAdmin** sur http://localhost:5050  
- Email : `admin@consignart.com`  
- Mot de passe : `admin`

Ajouter un serveur avec :
- Hôte : `db`
- Port : `5432`
- Utilisateur / mot de passe : ceux de votre `.env` (`DB_USERNAME` / `DB_PASSWORD`)

Connexion directe possible aussi sur `localhost:5434`.

---

## Utiliser l'API directement

Toutes les routes sont documentées et testables via Swagger : **http://localhost:3000/api/docs**

Flux typique :
1. `POST /auth/register` — inscrire une galerie
2. `POST /auth/login` — se connecter en admin → récupérer le token
3. `PATCH /users/:id/activate` — activer la galerie
4. `POST /artists` — créer un artiste
5. `POST /artworks` — consigner une œuvre
6. `POST /sales` — enregistrer une vente (génère facture + relevé artiste)
7. `GET /reports/dashboard/*` — consulter les tableaux de bord

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | NestJS · TypeORM · PostgreSQL |
| Frontend | React 19 · TypeScript · Vite |
| Auth | JWT (access + refresh) · bcrypt |
| Tests unitaires | Vitest |
| Tests E2E | Cypress 15 |
| Infra | Docker Compose |
| CI | GitHub Actions |
