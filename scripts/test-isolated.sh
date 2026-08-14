#!/bin/bash
# Lance la suite de tests d'intégration contre une base et un serveur dédiés.
#
# Les tests créent de vrais comptes via l'API : sans isolation ils polluent la base de
# développement (c'est l'origine des comptes *@test.com trouvés dans coaching_app).
#
# Usage : npm test  (ou npm run test:isolated, identique)
#
# `npm test` pointe sur CE script. Le lanceur brut est `npm run test:raw`, qui refuse
# de tourner si l'API ciblée n'est pas en NODE_ENV=test (cf. __tests__/helpers.js).

set -euo pipefail

TEST_DB="${TEST_DB:-coaching_app_test}"
TEST_PORT="${TEST_PORT:-5002}"
PG_CONTAINER="${PG_CONTAINER:-fitflow-db}"
DB_URL="postgresql://postgres:postgres@localhost:5432/${TEST_DB}"

cd "$(dirname "$0")/.."

echo "▸ Base de test : ${TEST_DB}"

if [ "${RESET_DB:-0}" = "1" ]; then
  # Un serveur de test laissé ouvert garde des connexions et bloque le DROP. On les coupe,
  # en ciblant strictement la base de test — jamais la base de développement.
  echo "  fermeture des connexions puis suppression…"
  docker exec "$PG_CONTAINER" psql -U postgres -tAc \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname='${TEST_DB}' AND pid <> pg_backend_pid();" >/dev/null
  docker exec "$PG_CONTAINER" psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
fi

if ! docker exec "$PG_CONTAINER" psql -U postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname='${TEST_DB}'" | grep -q 1; then
  echo "  création…"
  docker exec "$PG_CONTAINER" psql -U postgres -c "CREATE DATABASE ${TEST_DB} OWNER postgres;"
fi

echo "▸ Synchronisation du schéma"
# --accept-data-loss : la base de test est jetable et son schéma peut avoir divergé
# (colonnes supprimées depuis). Le drapeau ne porte QUE sur $DB_URL, construite plus
# haut à partir de $TEST_DB — jamais sur la base de développement.
DATABASE_URL="$DB_URL" npx prisma db push --skip-generate --accept-data-loss >/dev/null

echo "▸ Démarrage du serveur de test sur le port ${TEST_PORT}"
DATABASE_URL="$DB_URL" PORT="$TEST_PORT" NODE_ENV=test node src/server.js >/tmp/fitflow-test-server.log 2>&1 &
SERVER_PID=$!
# Arrête le serveur quoi qu'il arrive (succès, échec, interruption)
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  curl -sf -m 2 "http://localhost:${TEST_PORT}/api/health" >/dev/null 2>&1 && break
  sleep 0.5
done

if ! curl -sf -m 2 "http://localhost:${TEST_PORT}/api/health" >/dev/null 2>&1; then
  echo "✖ Le serveur de test n'a pas démarré. Journal :"
  tail -20 /tmp/fitflow-test-server.log
  exit 1
fi

echo "▸ Exécution des tests"
TEST_API_URL="http://localhost:${TEST_PORT}/api" npm run test:raw
