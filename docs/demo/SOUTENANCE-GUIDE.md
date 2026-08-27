# Guide de démo — Soutenance ConsignArt

Support pour rejouer la démo en direct via Swagger UI : **http://localhost:3000/api/docs**

Chaque étape indique : l'endpoint à ouvrir, le JSON à coller, le résultat attendu, et **ce qu'il faut dire au jury** (quel concept Nest.js / quelle règle métier ça illustre).

> 💡 Emails uniques : si un email est déjà pris (rejoué plusieurs fois), change juste le préfixe (ex. `contact@galerie-perrotin.fr` → `contact2@galerie-perrotin.fr`).

## 0. Prérequis avant la démo

```bash
docker compose up --build -d
npm run seed:admin     # depuis l'hôte, PAS docker compose exec (voir README)
```

Note les identifiants admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` dans `.env`).

---

## Partie 1 — Auth & rôles (JWT, guards, validation)

### 1.1 Inscription des comptes — `POST /auth/register`

Trois appels, un par rôle :

```json
{ "email": "contact@galerie-perrotin.fr", "password": "GalerieP3rrotin!", "firstName": "Emmanuel", "lastName": "Perrotin", "role": "gallery" }
```
```json
{ "email": "sophie.calle@artiste.fr", "password": "SophieC4lle!", "firstName": "Sophie", "lastName": "Calle", "role": "artist" }
```
```json
{ "email": "jean.dupont@collector.fr", "password": "J3anDup0nt!", "firstName": "Jean", "lastName": "Dupont", "role": "collector" }
```

**Résultat attendu** : la galerie a `"isActive": false`, artiste et collectionneur sont `true`.
**À dire** : *"Une galerie doit être validée par un admin avant d'être active — c'est vérifié dans `AuthService.register()`."*

### 1.2 Tentative d'inscription en admin — `POST /auth/register`

```json
{ "email": "hacker@test.fr", "password": "Test1234!", "firstName": "X", "lastName": "Y", "role": "admin" }
```
**Résultat attendu** : `403 Forbidden`.
**À dire** : *"Un admin ne peut pas s'auto-créer — seul `npm run seed:admin` le peut. Ça évite qu'un compte contourne la validation des galeries."*

### 1.3 Accès sans token — `GET /users`

Cliquer "Try it out" **sans** renseigner de token Bearer.
**Résultat attendu** : `401 Unauthorized`.
**À dire** : *"C'est le `JwtAuthGuard` global (`APP_GUARD`), actif sur toutes les routes sauf celles marquées `@Public()`."*

### 1.4 Login admin — `POST /auth/login`

```json
{ "email": "<ADMIN_EMAIL du .env>", "password": "<ADMIN_PASSWORD du .env>" }
```
Cliquer le cadenas 🔒 en haut de Swagger, coller le `access_token` reçu (sans "Bearer ").

### 1.5 Lister les utilisateurs (admin) — `GET /users`
**À dire** : *"Route protégée par `@Roles(Role.ADMIN)` + `RolesGuard`."* Repérer l'id de la galerie créée en 1.1.

### 1.6 Activer la galerie — `PATCH /users/{id}/activate`
Coller l'id de la galerie. **Résultat** : `isActive: true`.

### 1.7 Login galerie — `POST /auth/login`
Se reconnecter avec le compte galerie (maintenant actif), remplacer le token Bearer par celui de la galerie pour la suite.

---

## Partie 2 — Artistes & œuvres (pipes métier, historique)

### 2.1 Créer le profil artiste — `POST /artists`
```json
{
  "firstName": "Sophie", "lastName": "Calle",
  "bio": "Artiste plasticienne francaise, figure majeure de l'art conceptuel.",
  "nationality": "French", "birthYear": 1953,
  "specialty": "Photography", "websiteUrl": "https://sophiecalle.net",
  "userId": "<id du compte artist créé en 1.1>"
}
```
**À dire** : *"L'artiste est rattaché à une seule galerie — relation ManyToOne stricte."*

### 2.2 Créer une œuvre — `POST /artworks`
```json
{
  "title": "Les Dormeurs", "description": "Serie photographique...",
  "technique": "Photographie argentique", "year": 1979,
  "height": 40, "width": 60,
  "price": 8000, "reservePrice": 6000,
  "imageUrl": "https://example.com/les-dormeurs.jpg",
  "artistId": "<id artiste 2.1>"
}
```
**À dire** : *"`price`/`reservePrice` passent par le `PriceNormalizationPipe` (transformation métier : arrondi, rejet négatif). Un `ArtworkOwnerLimitPipe` vérifie aussi qu'on ne dépasse pas 50 œuvres actives par artiste."*

Créer une **2ᵉ œuvre** "Prenez soin de vous" (price 15000, reservePrice 12000) pour la partie exposition, et une **3ᵉ** "Douleur exquise" (price 3000, reservePrice 2500) pour le test de prêt/réserve.

### 2.3 Test rôle : un collectionneur ne peut pas créer d'œuvre
Se logger en collectionneur, tenter `POST /artworks` → **403**.
**À dire** : *"`@Roles(Role.GALLERY, Role.ADMIN)` sur la route."*

---

## Partie 3 — Exposition & prêt (statuts, `on_loan`)

### 3.1 Créer une exposition avec 0 œuvre — `POST /exhibitions`
```json
{ "title": "Expo vide", "location": "Nulle part", "startDate": "2026-10-01", "endDate": "2026-10-02", "artworkIds": [] }
```
**Résultat** : `400` — rejeté par `class-validator` avant même d'atteindre le service.

### 3.2 Créer l'exposition réelle (avec œuvre 2)
```json
{
  "title": "Nuit Blanche 2026", "location": "Galerie Perrotin, Paris",
  "startDate": "2026-09-01", "endDate": "2026-09-30",
  "artworkIds": ["<id œuvre 2>"]
}
```

### 3.3 Démarrer l'exposition — `PATCH /exhibitions/{id}/start`
**À dire** : *"Passage en `ongoing` déclenche automatiquement `changeStatus` sur les œuvres → `on_loan`."* Vérifier via `GET /artworks/{id de l'œuvre 2}` (⚠️ voir note cache ci-dessous).

### 3.4 Tenter de vendre l'œuvre en exposition — `POST /sales`
```json
{ "artworkId": "<id œuvre 2>", "salePrice": 15000 }
```
**Résultat** : `422 BusinessRuleViolation` / `ARTWORK_ON_LOAN`.
**À dire** : *"Géré par le `BusinessRuleViolationFilter`, distinct du filtre global d'exceptions."*

### 3.5 Prêt entre galeries — `POST /loans`
Nécessite une 2ᵉ galerie (répéter 1.1/1.6/1.7 avec un autre email). Prêter l'œuvre 3 :
```json
{
  "artworkId": "<id œuvre 3>", "borrowerGalleryId": "<id galerie 2>",
  "purpose": "Exposition temporaire Art Basel",
  "startDate": "2026-09-05", "expectedReturnDate": "2026-09-20",
  "conditions": "Transport assure, climatisation controlee"
}
```
Puis retenter le même prêt → `422 ARTWORK_NOT_AVAILABLE` (déjà prêtée).

### 3.6 Guard d'appartenance — galerie 2 modifie une œuvre de la galerie 1
Avec le token de la galerie 2 : `PATCH /artworks/{id œuvre 3}/status` → **403**.
**À dire** : *"`OwnershipGuard` vérifie `artwork.gallery.id === user.id`, indépendamment du rôle."*

### 3.7 Retour de prêt — `PATCH /loans/{id}/return`
Vérifier que l'œuvre repasse `available`.

---

## Partie 4 — Vente, commission, facture, relevé (transaction TypeORM)

### 4.1 Vente sous le prix de réserve — `POST /sales`
```json
{ "artworkId": "<id œuvre 3, prix reserve 2500>", "salePrice": 2000 }
```
**Résultat** : `422 BELOW_RESERVE_PRICE`.

### 4.2 Vente valide (en tant que collectionneur) — `POST /sales`
```json
{ "artworkId": "<id œuvre 1, prix catalogue 8000>", "salePrice": 8000 }
```
**Résultat attendu** : `commissionRate: 0.35`, `galleryCommission: 2800`, `artistAmount: 5200`, une `invoice` imbriquée.
**À dire** : *"Tout se passe dans une seule transaction TypeORM (`dataSource.transaction`) avec un verrou pessimiste (`pessimistic_write`) sur l'œuvre pour éviter une double-vente concurrente. La commission suit le barème 40/35/30% selon le prix."*

### 4.3 Récupérer la facture — `GET /sales/{id}/invoice`

### 4.4 Récupérer le relevé artiste — `GET /reports/artist-statements/artist/{artistId}`

---

## Partie 5 — Rapports & dashboards

- `GET /reports/dashboard/gallery` (en tant que galerie) → CA, top 5 artistes, taux de rotation
- `GET /reports/dashboard/artist/{artistId}` → ventes, commissions versées, œuvres disponibles
- `GET /reports/dashboard/admin` (en tant qu'admin) → utilisateurs actifs, volume, commissions plateforme

---

## Partie 6 — Détails techniques à montrer si le jury demande

- **Enveloppe de réponse** : chaque réponse a `{ data, meta, timestamp, statusCode }` → `ResponseInterceptor`.
- **Logs** : `docker compose exec api cat logs/http.log` → chaque requête tracée (méthode, route, durée, user) par `LoggingInterceptor`.
- **Cache** : `GET /artworks` et `GET /artworks/{id}` sont publics et mis en cache 30s (`CacheInterceptor`). ⚠️ Si tu changes un statut puis relis l'œuvre immédiatement, la réponse peut être périmée jusqu'à 30s — attends un peu ou mentionne-le si le jury le remarque, ça montre que tu maîtrises le trade-off.
- **Migrations** : `npm run migration:run` (depuis l'hôte) — 5 migrations historisées dans `src/database/migrations`.
- **Index** : colonne `artworks.status` indexée (`@Index()`).

---

## Ordre recommandé pour 20 minutes de démo

1. Inscription 3 rôles + refus admin (1.1, 1.2) — **2 min**
2. 401 sans token, activation galerie par l'admin (1.3–1.6) — **2 min**
3. Création artiste + œuvre + pipe prix (2.1, 2.2) — **2 min**
4. Rôle bloqué pour collector (2.3) — **1 min**
5. Exposition → on_loan → vente refusée (3.2–3.4) — **3 min**
6. Prêt inter-galeries + double-prêt refusé + ownership guard (3.5, 3.6) — **3 min**
7. Vente valide + commission + facture + relevé (4.1, 4.2, 4.3, 4.4) — **4 min**
8. Dashboards (Partie 5) — **2 min**
9. Enveloppe de réponse + logs (Partie 6) — **1 min**
