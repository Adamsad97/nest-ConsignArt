#!/usr/bin/env bash
# Script de démo ConsignArt — emails fixes (si un email existe déjà d'un run
# précédent, modifie-le ci-dessous avant de relancer).
# Prérequis : docker compose up --build -d ; npm run seed:admin (depuis l'hôte)
#
# Usage : bash docs/demo/demo-script.sh
#
# Chaque section affiche ce qu'elle teste et pourquoi (utile pour narrer en
# soutenance). Les erreurs 4xx/422 attendues ne stoppent pas le script.

set -uo pipefail
BASE="http://localhost:3000/api/v1"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

section() { echo; echo "=========================================="; echo "  $1"; echo "=========================================="; }
say()     { echo "-> $1"; }
field()   { echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }

if [ -f .env ]; then
  ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d= -f2-)
  ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)
fi
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ADMIN_EMAIL / ADMIN_PASSWORD introuvables (.env absent ?). Lance depuis la racine du projet."
  exit 1
fi

section "0. Health check"
curl -s "$BASE/health"; echo

# ---------------------------------------------------------------------------
section "1. Inscription des comptes (gallery / artist / collector)"
# ---------------------------------------------------------------------------
say "Une galerie qui s'inscrit doit rester inactive jusqu'a validation admin"
GALLERY_REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"email\": \"emanuel.reanault@consignart.fr\",
  \"password\": \"Reanault2026!\",
  \"firstName\": \"Emanuel\", \"lastName\": \"Reanault\", \"role\": \"gallery\"
}")
echo "$GALLERY_REG"
GALLERY_ID=$(field "$GALLERY_REG" id)

GALLERY2_REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"email\": \"daniella.boaba@consignart.fr\",
  \"password\": \"Boaba2026!\",
  \"firstName\": \"Daniella\", \"lastName\": \"Boaba\", \"role\": \"gallery\"
}")
GALLERY2_ID=$(field "$GALLERY2_REG" id)

ARTIST_REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"email\": \"sophie.girard@consignart.fr\",
  \"password\": \"Girard2026!\",
  \"firstName\": \"Sophie\", \"lastName\": \"Girard\", \"role\": \"artist\"
}")
echo "$ARTIST_REG"
ARTIST_USER_ID=$(field "$ARTIST_REG" id)

COLLECTOR_REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{
  \"email\": \"jean.laurent@consignart.fr\",
  \"password\": \"Laurent2026!\",
  \"firstName\": \"Jean\", \"lastName\": \"Laurent\", \"role\": \"collector\"
}")
echo "$COLLECTOR_REG"
COLLECTOR_ID=$(field "$COLLECTOR_REG" id)

say "Un admin ne peut pas s'auto-enregistrer -> attendu 400 (role rejete par le DTO avant meme le service)"
curl -s -w " [HTTP %{http_code}]\n" -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d '{
  "email": "hacker@test.fr", "password": "Hacker2026", "firstName": "X", "lastName": "Y", "role": "admin"
}'

# ---------------------------------------------------------------------------
section "2. JwtAuthGuard + activation admin"
# ---------------------------------------------------------------------------
say "Sans token -> attendu 401"
curl -s -o /dev/null -w "GET /users sans token -> HTTP %{http_code}\n" "$BASE/users"

say "Login admin"
ADMIN_LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{
  \"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"
}")
ADMIN_TOKEN=$(field "$ADMIN_LOGIN" access_token)
[ -z "$ADMIN_TOKEN" ] && { echo "Login admin echoue: $ADMIN_LOGIN"; exit 1; }

say "Activation des 2 galeries par l'admin"
curl -s -X PATCH "$BASE/users/$GALLERY_ID/activate" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
curl -s -X PATCH "$BASE/users/$GALLERY2_ID/activate" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
echo "Galeries activées."

say "Login galerie 1 et galerie 2"
GALLERY_TOKEN=$(field "$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"emanuel.reanault@consignart.fr\",\"password\":\"Reanault2026!\"}")" access_token)
GALLERY2_TOKEN=$(field "$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"daniella.boaba@consignart.fr\",\"password\":\"Boaba2026!\"}")" access_token)
COLLECTOR_LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"jean.laurent@consignart.fr\",\"password\":\"Laurent2026!\"}")
COLLECTOR_TOKEN=$(field "$COLLECTOR_LOGIN" access_token)
COLLECTOR_REFRESH=$(echo "$COLLECTOR_LOGIN" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

# ---------------------------------------------------------------------------
section "3. Artiste + oeuvres (pipes metier)"
# ---------------------------------------------------------------------------
ARTIST=$(curl -s -X POST "$BASE/artists" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"firstName\": \"Sophie\", \"lastName\": \"Girard\",
  \"bio\": \"Artiste plasticienne francaise, figure majeure de l'art conceptuel.\",
  \"nationality\": \"French\", \"birthYear\": 1953,
  \"specialty\": \"Photography\", \"websiteUrl\": \"https://sophiegirard.net\",
  \"userId\": \"$ARTIST_USER_ID\"
}")
echo "$ARTIST"
ARTIST_ID=$(field "$ARTIST" id)

say "Creation de 3 oeuvres (vente / exposition-pret / reserve)"
AW1=$(curl -s -X POST "$BASE/artworks" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"title\": \"Les Dormeurs\", \"technique\": \"Photographie argentique\", \"year\": 1979,
  \"height\": 40, \"width\": 60, \"price\": 8000, \"reservePrice\": 6000,
  \"artistId\": \"$ARTIST_ID\"
}")
ARTWORK1_ID=$(field "$AW1" id)

AW2=$(curl -s -X POST "$BASE/artworks" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"title\": \"Prenez soin de vous\", \"technique\": \"Installation video\", \"year\": 2007,
  \"price\": 15000, \"reservePrice\": 12000,
  \"artistId\": \"$ARTIST_ID\"
}")
ARTWORK2_ID=$(field "$AW2" id)

AW3=$(curl -s -X POST "$BASE/artworks" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"title\": \"Douleur exquise\", \"technique\": \"Livre d'artiste\", \"year\": 2003,
  \"price\": 3000, \"reservePrice\": 2500,
  \"artistId\": \"$ARTIST_ID\"
}")
ARTWORK3_ID=$(field "$AW3" id)
echo "Oeuvres créées: $ARTWORK1_ID / $ARTWORK2_ID / $ARTWORK3_ID"

say "RolesGuard: un collectionneur ne peut pas creer d'oeuvre -> attendu 403"
curl -s -w " [HTTP %{http_code}]\n" -X POST "$BASE/artworks" -H "Content-Type: application/json" -H "Authorization: Bearer $COLLECTOR_TOKEN" -d "{
  \"title\": \"Interdit\", \"technique\": \"Peinture\", \"year\": 2020, \"price\": 1000, \"reservePrice\": 500, \"artistId\": \"$ARTIST_ID\"
}"

# ---------------------------------------------------------------------------
section "4. Exposition -> on_loan -> vente refusee"
# ---------------------------------------------------------------------------
say "Exposition avec 0 oeuvre -> attendu 400 (validation DTO)"
curl -s -w " [HTTP %{http_code}]\n" -X POST "$BASE/exhibitions" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d '{
  "title": "Expo vide", "location": "Nulle part", "startDate": "2026-10-01", "endDate": "2026-10-02", "artworkIds": []
}'

EXHIBITION=$(curl -s -X POST "$BASE/exhibitions" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"title\": \"Nuit Blanche 2026\", \"location\": \"Galerie Perrotin, Paris\",
  \"startDate\": \"2026-09-01\", \"endDate\": \"2026-09-30\", \"artworkIds\": [\"$ARTWORK2_ID\"]
}")
EXHIBITION_ID=$(field "$EXHIBITION" id)

curl -s -X PATCH "$BASE/exhibitions/$EXHIBITION_ID/start" -H "Authorization: Bearer $GALLERY_TOKEN" > /dev/null
echo "Exposition démarrée -> artwork2 doit passer on_loan (attendre le TTL cache 30s pour un GET fiable)"

say "Tentative de vente d'une oeuvre on_loan -> attendu 422 ARTWORK_ON_LOAN"
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/sales" -H "Content-Type: application/json" -H "Authorization: Bearer $COLLECTOR_TOKEN" -d "{
  \"artworkId\": \"$ARTWORK2_ID\", \"salePrice\": 15000
}"

# ---------------------------------------------------------------------------
section "5. Pret inter-galeries + OwnershipGuard"
# ---------------------------------------------------------------------------
LOAN=$(curl -s -X POST "$BASE/loans" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"artworkId\": \"$ARTWORK3_ID\", \"borrowerGalleryId\": \"$GALLERY2_ID\",
  \"purpose\": \"Exposition temporaire Art Basel\",
  \"startDate\": \"2026-09-05\", \"expectedReturnDate\": \"2026-09-20\",
  \"conditions\": \"Transport assure, climatisation controlee\"
}")
echo "$LOAN"
LOAN_ID=$(field "$LOAN" id)

say "Re-preter la meme oeuvre -> attendu 422 ARTWORK_NOT_AVAILABLE"
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/loans" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{
  \"artworkId\": \"$ARTWORK3_ID\", \"borrowerGalleryId\": \"$GALLERY2_ID\",
  \"purpose\": \"Second pret\", \"startDate\": \"2026-09-05\", \"expectedReturnDate\": \"2026-09-20\"
}"

say "OwnershipGuard: galerie 2 modifie une oeuvre de la galerie 1 -> attendu 403"
curl -s -w "\n[HTTP %{http_code}]\n" -X PATCH "$BASE/artworks/$ARTWORK3_ID/status" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY2_TOKEN" -d '{"status": "returned"}'

say "Retour de pret"
curl -s -X PATCH "$BASE/loans/$LOAN_ID/return" -H "Authorization: Bearer $GALLERY_TOKEN" | grep -o '"status":"[^"]*"' | head -1

# ---------------------------------------------------------------------------
section "6. Vente, commission, facture, releve"
# ---------------------------------------------------------------------------
say "Vente sous le prix de reserve -> attendu 422 BELOW_RESERVE_PRICE"
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/sales" -H "Content-Type: application/json" -H "Authorization: Bearer $COLLECTOR_TOKEN" -d "{
  \"artworkId\": \"$ARTWORK3_ID\", \"salePrice\": 2000
}"

say "Vente valide (8000e -> commission 35%)"
SALE=$(curl -s -X POST "$BASE/sales" -H "Content-Type: application/json" -H "Authorization: Bearer $COLLECTOR_TOKEN" -d "{
  \"artworkId\": \"$ARTWORK1_ID\", \"salePrice\": 8000
}")
echo "$SALE"
SALE_ID=$(field "$SALE" id)

say "Facture de la vente"
curl -s "$BASE/sales/$SALE_ID/invoice" -H "Authorization: Bearer $COLLECTOR_TOKEN"; echo

say "Releve artiste (genere automatiquement par la vente)"
curl -s "$BASE/reports/artist-statements/artist/$ARTIST_ID" -H "Authorization: Bearer $GALLERY_TOKEN"; echo

# ---------------------------------------------------------------------------
section "7. Transfert d'artiste (admin only) + validation DTO"
# ---------------------------------------------------------------------------
say "Refuse si tente par une galerie -> attendu 403"
curl -s -w "\n[HTTP %{http_code}]\n" -X PATCH "$BASE/artists/$ARTIST_ID/transfer" -H "Content-Type: application/json" -H "Authorization: Bearer $GALLERY_TOKEN" -d "{\"galleryId\": \"$GALLERY2_ID\"}"

say "Refuse si galleryId manquant -> attendu 400 (DTO valide)"
curl -s -w "\n[HTTP %{http_code}]\n" -X PATCH "$BASE/artists/$ARTIST_ID/transfer" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{}'

say "Transfert valide (admin)"
curl -s -X PATCH "$BASE/artists/$ARTIST_ID/transfer" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d "{\"galleryId\": \"$GALLERY2_ID\"}" | grep -o '"gallery":{"id":"[^"]*"'

# ---------------------------------------------------------------------------
section "8. Refresh token rotation"
# ---------------------------------------------------------------------------
say "Refresh puis reutilisation du meme token -> le 2e doit echouer (401)"
curl -s -X POST "$BASE/auth/refresh" -H "Content-Type: application/json" -d "{\"refreshToken\": \"$COLLECTOR_REFRESH\"}" > /dev/null
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/auth/refresh" -H "Content-Type: application/json" -d "{\"refreshToken\": \"$COLLECTOR_REFRESH\"}"

# ---------------------------------------------------------------------------
section "9. Dashboards"
# ---------------------------------------------------------------------------
say "Dashboard galerie"
curl -s "$BASE/reports/dashboard/gallery" -H "Authorization: Bearer $GALLERY_TOKEN"; echo
say "Dashboard artiste (via admin: l'artiste a ete transfere a la galerie 2 en section 7,"
say "donc le token de la galerie 1 n'a plus acces a ses rapports -> RGPD-like isolation)"
curl -s "$BASE/reports/dashboard/artist/$ARTIST_ID" -H "Authorization: Bearer $ADMIN_TOKEN"; echo
say "Dashboard admin"
curl -s "$BASE/reports/dashboard/admin" -H "Authorization: Bearer $ADMIN_TOKEN"; echo

section "Terminé — voir logs/http.log dans le conteneur pour la trace complète"
