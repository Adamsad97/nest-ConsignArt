# ConsignArt — Description des tables et guide d'accès

Nombre de tables : 11

┌─────┬────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
│ # │ Table │ Justification dans le sujet │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 1 │ users │ Section 1 — tous les rôles (admin, gallery, artist, collector), authentification │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 2 │ refresh_tokens │ Section 1 — JWT avec access token + refresh token obligatoire │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 3 │ artists │ Section 2 — entité dédiée (bio, portfolio, nationalité, statut, date d'entrée, galerie) │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 4 │ artworks │ Section 3 — œuvres avec tous leurs attributs │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 5 │ artwork_status_history │ Section 3 — "le changement de statut est tracé (on garde l'historique)" │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 6 │ exhibitions │ Section 5 — nom, dates, lieu/lien, galerie organisatrice │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 7 │ exhibition_artworks │ Section 5 — relation ManyToMany exposition ↔ œuvre │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 8 │ loans │ Section 5 — prêts inter-galeries avec dates et conditions │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 9 │ sales │ Section 4 — contrat de vente (acheteur, œuvre, prix, commission, solde artiste) │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 10 │ invoices │ Section 4 — "facture générée pour l'acheteur" │
├─────┼────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ 11 │ artist_statements │ Section 4 — "relevé de vente pour l'artiste" │
└─────┴────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘

---

Schéma des relations

users (1) ──────── (N) artists ────── (N) artworks ──── (N) artwork_status_history
│ │ │
│ (collector) │ (gallery_id) │ (ManyToMany)
│ │ ▼
│ │ exhibition_artworks
│ │ │
│ │ ▼
│ └──────────── exhibitions
│
└─── refresh_tokens

artworks (1) ──── (1) loans ──── (1) gallery (borrower)
artworks (1) ──── (1) sales ──── (1) invoices
│
└──────────── artist_statements

---

Ce qui manque dans le projet actuel

Le projet actuel n'a que 2 tables (users, artworks). Il manque 9 tables par rapport au sujet :

- refresh_tokens (JWT refresh token)
- artists (entité artiste séparée)
- artwork_status_history (traçabilité des statuts)
- exhibitions + exhibition_artworks
- loans
- sales + invoices + artist_statements

Veux-tu qu'on planifie la mise en place de ces tables manquantes ?

✻ Churned for 35s

❯ explique ce que chaque table doit faire

Rôle de chaque table

---

1. users

Qui sont les utilisateurs de la plateforme.

C'est la table centrale d'authentification. Elle stocke tous les comptes quelle que soit leur nature (admin, galerie, artiste, collectionneur). Le champ role détermine ce que l'utilisateur peut faire. Le mot de passe est haché avec bcrypt. isActive permet à l'admin de valider ou bloquer un compte (obligatoire pour le rôle gallery).

id | email | password (hashed) | firstName | lastName | role | isActive | createdAt | updatedAt

---

2. refresh_tokens

Gérer la durée de vie des sessions JWT.

Quand un utilisateur se connecte, il reçoit deux tokens : un access_token (courte durée, ex. 15min) et un refresh_token (longue durée, ex. 7 jours). Cette table stocke les refresh tokens en base pour pouvoir les invalider (déconnexion, révocation). Sans cette table, on ne peut pas "forcer" la déconnexion d'un utilisateur.

id | token | userId (FK) | expiresAt | isRevoked | createdAt

---

3. artists

Le profil professionnel d'un artiste, géré par une galerie.

Un artiste n'est pas seulement un compte utilisateur — c'est aussi une fiche professionnelle avec une biographie, un portfolio, une nationalité. Une galerie enregistre des artistes dans son catalogue. Un artiste peut avoir un compte users (pour se connecter et suivre ses ventes) ou être juste une fiche sans compte. La galerie de rattachement peut changer (transfert avec accord admin).

id | firstName | lastName | biography | portfolioUrl | nationality | status (active/inactive) | entryDate | galleryId (FK → users) | userId (FK → users, nullable) | createdAt | updatedAt

---

4. artworks

Les œuvres d'art déposées en consignation.

Une œuvre appartient à un artiste et est confiée à une galerie pour être exposée et vendue. Elle a un prix de vente et un prix de réserve (plancher en dessous duquel la vente est impossible). Son statut change au fil du temps : disponible → en prêt → vendue → rendue.

id | title | description | year | technique | height | width | depth | price | reservePrice | status | imageUrl | consignmentDate | artistId (FK → artists) | galleryId (FK → users) | createdAt | updatedAt

---

5. artwork_status_history

Tracer chaque changement de statut d'une œuvre.

Le sujet exige explicitement de conserver l'historique des statuts. Quand une œuvre passe de available à on_loan, puis à sold, chaque transition est enregistrée ici avec la date et qui a effectué le changement. C'est la traçabilité métier complète.

id | artworkId (FK) | previousStatus | newStatus | changedAt | changedBy (FK → users)

---

6. exhibitions

Les expositions organisées par une galerie.

Une galerie peut monter une exposition physique (avec un lieu) ou virtuelle (avec un lien). Elle a une durée définie. Pendant cette durée, toutes les œuvres sélectionnées passent en statut on_loan et ne peuvent pas être vendues.

id | name | startDate | endDate | location | virtualLink | galleryId (FK → users) | createdAt | updatedAt

---

7. exhibition_artworks

Lier des œuvres à des expositions (relation ManyToMany).

Une exposition contient plusieurs œuvres, et une œuvre peut participer à plusieurs expositions (pas en même temps, mais au fil du temps). Cette table de jointure matérialise ce lien. C'est ce que le sujet appelle la relation ManyToMany obligatoire avec TypeORM.

exhibitionId (FK → exhibitions) | artworkId (FK → artworks)

---

8. loans

Enregistrer le prêt d'une œuvre à une autre galerie.

Une galerie peut prêter une œuvre à une autre galerie pour une exposition temporaire. Ce prêt a des dates précises et des conditions particulières. Le sujet interdit de prêter une œuvre déjà prêtée — cette table permet de vérifier cette règle. L'œuvre passe en statut on_loan pendant toute la durée du prêt.

id | artworkId (FK) | lendingGalleryId (FK → users) | borrowingGalleryId (FK → users) | startDate | endDate | conditions | createdAt

---

9. sales

Le contrat de vente d'une œuvre.

C'est la table financière principale. Quand une galerie vend une œuvre à un collectionneur, tout est enregistré ici : qui a acheté, à quel prix, quelle commission a été prélevée (calculée selon les paliers 30/35/40 %), et combien revient à l'artiste. C'est l'opération qui doit se faire dans une transaction TypeORM (vente + mise à jour statut artwork + calcul commission en une seule opération atomique).

id | artworkId (FK) | buyerId (FK → users) | galleryId (FK → users) | artistId (FK → artists) | salePrice | commissionRate | commissionAmount | artistBalance | saleDate | createdAt

---

10. invoices

La facture générée pour l'acheteur.

À chaque vente, une facture est émise pour le collectionneur. C'est un "simple enregistrement en base" selon le sujet — pas de génération PDF requise. Elle récapitule ce que le collectionneur a payé, pour quelle œuvre, à quelle date.

id | saleId (FK → sales) | buyerId (FK → users) | amount | generatedAt

---

11. artist_statements

Le relevé de vente généré pour l'artiste.

Symétrique de la facture, mais côté artiste. Quand son œuvre est vendue, l'artiste reçoit un relevé indiquant le prix de vente, la commission prélevée par la galerie, et le montant net qui lui revient. Permet à l'artiste de "consulter ses revenus" comme l'exige le sujet.

id | saleId (FK → sales) | artistId (FK → artists) | salePrice | commissionAmount | netAmount | generatedAt

---

Vue d'ensemble des flux

[users] ──────────────────────────────────────────────────────┐
│ gallery │ collector
│ │
├──(possède)──► [artists] ──(possède)──► [artworks] │
│ │ │
│ ┌────────────┤ │
│ │ │ │
│ [artwork_status_history] [sales] ◄────┘
│ │
├──(organise)──► [exhibitions] ├──► [invoices]
│ │ ManyToMany └──► [artist_statements]
│ [exhibition_artworks]
│
└──(prête)──► [loans]

[users] ──► [refresh_tokens]

---

## En résumé : 4 tables de domaine métier (artworks, artists, exhibitions, loans), 3 tables de flux financiers (sales, invoices, artist_statements), 2 tables d'infrastructure (users, refresh_tokens), 2 tables de traçabilité (artwork_status_history, exhibition_artworks).

## Schéma des relations

```
┌──────────┐  1:N  ┌─────────────────┐
│  users   │──────▶│ refresh_tokens  │
└────┬─────┘       └─────────────────┘
     │
     │ 1:N (gallery)
     ▼
┌──────────┐  1:N  ┌───────────────────────┐  1:N  ┌─────────────────────────┐
│ artists  │──────▶│       artworks        │──────▶│ artwork_status_history  │
└──────────┘       └───────────┬───────────┘       └─────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌────────────┐  ┌────────────┐
     │  exhibition  │  │   loans    │  │   sales    │──▶ invoices
     │   _artworks  │  └────────────┘  └────────────┘
     └──────────────┘
            ▲
     ┌──────────────┐
     │ exhibitions  │
     └──────────────┘

     ┌─────────────────────┐
     │  artist_statements  │
     └─────────────────────┘
```

---

## Etapes pour voir les tables

### Etape 1 — Démarrer la stack

```bash
docker compose up -d
```

---

### Etape 2 — Choisir une méthode

#### Méthode A — Terminal (aucune installation)

```bash
# Lister les 11 tables
docker exec consign-art-project-db-1 psql -U consignart -d consignart_db -c "\dt"

# Voir la structure d'une table
docker exec consign-art-project-db-1 psql -U consignart -d consignart_db -c "\d users"

# Voir les données
docker exec consign-art-project-db-1 psql -U consignart -d consignart_db -c "SELECT * FROM users;"
```

#### Méthode B — pgAdmin (interface web, inclus dans Docker)

```bash
docker compose up -d pgadmin
# Attendre ~60 sec puis ouvrir http://localhost:5050
```

Connexion pgAdmin :

- Email : `admin@consignart.com` / Mot de passe : `admin`

Enregistrer le serveur (onglet Connection) :

- Host : `db` | Port : `5432` | Database : `consignart_db`
- Username : `consignart` | Password : `consignart_secret`

Naviguer : `Servers > ConsignArt > Databases > consignart_db > Schemas > public > Tables`

#### Méthode C — DBeaver (client desktop, recommandé)

Connexion : Host `localhost` | Port `5432` | Database `consignart_db` | User `consignart` | Password `consignart_secret`

---

### Etape 3 — Arrêter

```bash
docker compose down          # conserve les données
docker compose down -v       # supprime aussi les données
```

---

## Ports

| Service    | URL                   |
| ---------- | --------------------- |
| API NestJS | http://localhost:3000 |
| pgAdmin    | http://localhost:5050 |
| PostgreSQL | localhost:5432        |
