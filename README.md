# ConsignArt

[![CI](https://github.com/Adamsad97/nest-ConsignArt/actions/workflows/ci.yml/badge.svg)](https://github.com/Adamsad97/nest-ConsignArt/actions/workflows/ci.yml)

Plateforme B2B de gestion de consignation d'œuvres d'art. Un artiste confie ses œuvres à une galerie, qui les expose et les vend moyennant commission. Le projet comprend une **API REST NestJS** et une **interface web React** complète, le tout conteneurisé avec Docker.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | NestJS · TypeORM · PostgreSQL |
| Frontend | React · TypeScript · Vite |
| Auth | JWT (access + refresh tokens) · bcrypt |
| Tests unitaires | Vitest |
| Tests E2E | Cypress 15 (10 suites, 77 cas d'usage) |
| Infra | Docker Compose |
| CI | GitHub Actions |

---

## Fonctionnalités

- **Auth** — JWT access + refresh tokens, bcrypt, activation galerie par admin. Les comptes admin ne peuvent pas s'auto-enregistrer (seuls `gallery` / `artist` / `collector` ont accès à l'inscription publique) — le premier admin est bootstrappé via `npm run seed:admin`
- **Artistes** — catalogue géré par galerie, transfert entre galeries réservé à l'admin
- **Œuvres** — cycle de vie de la consignation (`available` → `on_loan` → `sold` / `returned`), historique complet des statuts, respect du prix de réserve, limite de 50 œuvres actives par artiste
- **Expositions & prêts** — disponibilité des œuvres automatiquement mise à jour
- **Ventes** — transaction atomique (verrou ligne PostgreSQL), commission par paliers (40 / 35 / 30 %), facture + relevé artiste générés automatiquement à chaque vente
- **Rapports** — tableaux de bord galerie, artiste et admin
- **Interface web** — UI galerie complète (thème sombre, typographie Georgia/Outfit), connectée aux 40 cas d'usage métier

---

## Architecture

```
nest-ConsignArt/
├── src/                        # API NestJS
│   ├── auth/                   # JWT, guards, refresh tokens
│   ├── users/                  # Gestion des comptes
│   ├── artists/                # Module artistes
│   ├── artworks/               # Module œuvres + historique statut
│   ├── exhibitions/            # Module expositions
│   ├── loans/                  # Module prêts
│   ├── sales/                  # Module ventes + factures
│   ├── reports/                # Tableaux de bord & relevés artistes
│   └── common/                 # Guards, interceptors, filtres, pagination
├── frontend/                   # App React/Vite
│   ├── src/pages/              # 13 pages (Artworks, Sales, Exhibitions, …)
│   ├── src/services/           # Clients API typés
│   └── cypress/e2e/            # 10 suites de tests E2E (UC00–UC35)
└── docker-compose.yml
```

### Schéma de base de données

```
users ──< artists ──< artworks ──< artwork_status_history
      │                  ├──< exhibition_artworks >── exhibitions
      │                  ├──< loans
      │                  └──< sales ──── invoices
      ├──< exhibitions
      ├──< loans
      ├──< sales
      └──< refresh_tokens

artists ──< artist_statements
```

---

## Choix techniques

| Choix | Raison |
|---|---|
| PostgreSQL | Verrou ligne nécessaire pour la transaction de vente, intégrité relationnelle sur 11 tables |
| JWT access + refresh | Accès stateless ; refresh tokens stockés hachés et révocables |
| Vitest | Plus rapide que Jest pour cette taille de projet, support natif ESM/TS via SWC |
| Admin bootstrappé par script | L'auto-inscription en `admin` contournerait entièrement le workflow de validation galerie |
| `forbidNonWhitelisted: true` | ValidationPipe strict : tout champ non déclaré dans le DTO provoque une erreur 400 |

---

## Prérequis

- Docker & Docker Compose
- Node.js ≥ 20 (pour les tests Cypress en local)

---

## Démarrage rapide

### 1. Cloner

```bash
git clone https://github.com/Adamsad97/nest-ConsignArt.git
cd nest-ConsignArt
```

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Les valeurs par défaut fonctionnent directement avec Docker Compose.

### 3. Lancer le projet

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Frontend | http://localhost:5173 |
| pgAdmin | http://localhost:5050 |

Le schéma de base de données est créé automatiquement au premier démarrage.

### 4. Créer le premier compte admin

```bash
# Dans un autre terminal (la DB doit être démarrée)
docker compose exec api npm run seed:admin
```

Idempotent : sans effet si l'email existe déjà. Les identifiants sont définis dans `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

---

## Migrations (optionnel)

Pour un setup production-like à la place de la synchronisation automatique :

```bash
npm run migration:run        # appliquer les migrations en attente
npm run migration:generate   # générer depuis les changements d'entités
npm run migration:revert     # annuler la dernière migration
```

---

## Flux typique d'utilisation

1. **Inscription galerie** → `POST /auth/register` (rôle `gallery`)
2. **Activation par admin** → `PATCH /users/:id/activate`
3. **Galerie se connecte** → `POST /auth/login`
4. **Enregistrer un artiste** → `POST /artists`
5. **Consigner une œuvre** → `POST /artworks`
6. **Créer une exposition** → `POST /exhibitions` + ajouter des œuvres
7. **Enregistrer une vente** → `POST /sales` (génère facture + relevé artiste)
8. **Consulter les rapports** → `GET /reports/dashboard/*`

Toutes les routes sont explorables via Swagger : **http://localhost:3000/api/docs**

---

## Tests

### Tests unitaires (Vitest)

```bash
npm test
```

### Tests E2E (Cypress)

Les suites couvrent **77 cas d'usage** répartis en 10 fichiers :

| Spec | Cas d'usage |
|---|---|
| `00-setup` | Santé de l'API, seed admin |
| `01-auth` | UC1–UC7 : inscription, login, refresh, logout |
| `02-artworks-public` | UC8–UC12 : consultation publique des œuvres |
| `03-artists` | UC13–UC14 : gestion des artistes |
| `04-artworks-manage` | UC15–UC18 : CRUD œuvres, changement de statut |
| `05-exhibitions` | UC19–UC27 : expositions |
| `06-loans` | UC28–UC31 : prêts |
| `07-sales` | UC32–UC35 : ventes & factures |
| `08-reports` | UC36–UC40 : rapports & dashboards |
| `09-access-control` | Contrôle d'accès par rôle |

```bash
# Depuis le dossier frontend/ (Docker doit être démarré)
cd frontend
npx cypress run                    # toute la suite (headless)
npx cypress open                   # mode interactif
npx cypress run --spec "cypress/e2e/07-sales.cy.ts"  # une suite spécifique
```

---

## Inspecter la base de données

Ouvrir **pgAdmin** sur http://localhost:5050 (`admin@consignart.com` / `admin`), ajouter un serveur pointant vers l'hôte `db`, port `5432`, avec les identifiants du `.env` — ou connecter n'importe quel client SQL sur `localhost:5434`.

---

## Arrêt et nettoyage

```bash
docker compose down              # arrêter (conserve images et données)
docker compose down -v           # + supprimer le volume DB (efface toutes les données)
docker compose down --rmi all    # + supprimer les images Docker du projet
docker compose down -v --rmi all # nettoyage complet
```

---

## Conventions Git

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/) :  
`feat(scope): summary` · `fix(scope): summary` · `docs: …` · `test: …` · `ci: …`

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | Production stable |
| `develop` | Intégration continue |
| `arole` | Branche de travail courante |
