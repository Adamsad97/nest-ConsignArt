# ConsignArt

API REST pour la gestion de dépôt-vente d'œuvres d'art entre artistes et galeries. NestJS, TypeORM, PostgreSQL.

## Prérequis

Docker et Docker Compose (rien d'autre à installer).

## 1. Cloner et configurer

```bash
git clone https://github.com/Adamsad97/nest-ConsignArt.git
cd nest-ConsignArt
cp .env.example .env
```

Les valeurs par défaut du `.env.example` fonctionnent telles quelles avec Docker Compose.

## 2. Démarrer

```bash
docker compose up --build
```

Ça lance l'API, PostgreSQL et pgAdmin. Le schéma de base est créé automatiquement au premier démarrage — rien d'autre à faire.

Une fois démarré :

- API : http://localhost:3000/api/v1
- Documentation interactive Swagger : **http://localhost:3000/api/docs**
- pgAdmin : http://localhost:5050

## 3. Créer le compte admin

Un admin ne peut pas s'inscrire via l'API (seuls `gallery`, `artist`, `collector` le peuvent — c'est une règle métier volontaire). Il faut le créer une fois via un script, **depuis l'hôte** (pas dans le conteneur) :

```bash
npm install
npm run seed:admin
```

Ça crée le compte à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`. Sans risque à relancer plusieurs fois.

## 4. Tester l'application

Le plus rapide : ouvrir **http://localhost:3000/api/docs** (Swagger) et exécuter les routes directement dans le navigateur.

Pour un scénario complet déjà prêt (inscription des rôles, règles métier, vente, dashboards...), deux options équivalentes dans `docs/demo/` :

- **Script shell** — rejoue tout le parcours en une commande :
  ```bash
  bash docs/demo/demo-script.sh
  ```
- **Collection Postman** — `docs/demo/ConsignArt.postman_collection.json` (à importer dans Postman ; renseigner `adminEmail`/`adminPassword` dans les variables de la collection avec les valeurs du `.env` avant de lancer)

Les deux créent automatiquement ces comptes de démonstration :

- Galerie — `emanuel.reanault@consignart.fr` / `Reanault2026!`
- Galerie 2 — `daniella.boaba@consignart.fr` / `Boaba2026!`
- Artiste — `sophie.girard@consignart.fr` / `Girard2026!`
- Collectionneur — `jean.laurent@consignart.fr` / `Laurent2026!`

Le guide pas-à-pas complet (avec ce qu'il faut dire à chaque étape) est dans `docs/demo/SOUTENANCE-GUIDE.md`.

⚠️ Ces emails sont fixes : si vous rejouez le script/la collection sans repartir d'une base propre, l'inscription échouera (`409`, email déjà pris) — repartez d'une base propre (étape 6) ou changez les emails à la main.

## 5. Inspecter les données (optionnel)

pgAdmin : http://localhost:5050 (`admin@consignart.com` / `admin`) — ajouter un serveur pointant vers l'hôte `db`, port `5432`, avec les identifiants du `.env`. Ou connecter n'importe quel client SQL à `localhost:5434` directement.

## 6. Arrêter et nettoyer

```bash
docker compose down              # arrête et supprime les conteneurs (garde images et données)
docker compose down -v           # supprime aussi le volume de la base (efface toutes les données)
```

## Tests automatisés

```bash
npm test          # tests unitaires
npm run test:e2e  # tests d'intégration (nécessite les conteneurs démarrés, voir étape 2)
```
