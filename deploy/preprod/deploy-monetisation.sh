#!/usr/bin/env bash
# Deploys the credit model on WAGESSE preproduction only.
# It dumps wagesse_preprod, restores that dump on a temporary database,
# applies the reviewed credit and account-access migrations, and restarts only wagesse-preprod.
# The production database, nginx and the other vhosts are not modified.
# On failure the previous application files are restored. The database is not
# restored automatically: the dump path is printed.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh monetisation <commit>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root

LOGO=7a2a9719cddf354bb66914107b53c748f92bffda
AUTH=d01574087fcbf740e7d9bd5ea4f715a32f7ed113
MIGRATION=20261121190000_quote_submission_credit
MIGRATION_SHA=47b47f7994fd4ea5a52c61a267883e4c4b9f72b5a9632a75aa7c2df3720a37c8
MIGRATION_ACCESS=20261123160000_account_access
MIGRATION_ACCESS_SHA=4fa3db1c17eb10549bc1069a5cd9e694e60bbbe2bee0a3ae0b2581451f8bb70a
APP=/opt/wagesse-preprod/app
ENV_FILE=/etc/wagesse/preprod.env
NODE_BIN=/opt/wagesse-preprod/.node/bin
REF="${1:-}"
DUMP=

step=integrite
[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "Commit complet requis."
[[ "$APP" != "/opt/wagesse-prod/app" ]] || die "Refus de toucher la production."
bash "$DIR/preflight.sh" "$REF"
[[ -d "$APP/.git" && -x "$NODE_BIN/node" && -f "$ENV_FILE" ]] || die "Préproduction incomplète. Arrêt avant modification."

step=base
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
assert_preprod_database
grep -q '^PAYMENT_MODE=MANUAL$' "$ENV_FILE" || die "PAYMENT_MODE n'est pas MANUAL. Arrêt avant modification."
grep -q '^PHONE_VERIFICATION_REQUIRED=false$' "$ENV_FILE" || die "La vérification SMS obligatoire est active. Arrêt avant modification."
grep -q '^OTP_DEBUG_RETURN=true$' "$ENV_FILE" && die "OTP_DEBUG_RETURN est ouvert. Arrêt avant modification."
grep -q '^SMS_ALLOW_SIMULATE=true$' "$ENV_FILE" && die "La simulation SMS est ouverte. Arrêt avant modification."
db_url="$DATABASE_URL"
unset DATABASE_URL

step=ancetre
git_in "$APP" fetch --no-tags origin "$EXPECTED_BASE" || die "Impossible de lire le commit de référence ${EXPECTED_BASE}."
git_in "$APP" fetch --no-tags origin "$LOGO" || die "Impossible de lire le logo ${LOGO}."
git_in "$APP" fetch --no-tags origin "$AUTH" || die "Impossible de lire l'authentification ${AUTH}."
git_in "$APP" fetch --no-tags origin "$REF" || die "Impossible de lire ${REF}."
git_in "$APP" cat-file -e "${REF}^{commit}"
git_in "$APP" merge-base --is-ancestor "$LOGO" "$REF" || die "Le commit ${REF} ne contient pas le logo officiel ${LOGO}."
git_in "$APP" merge-base --is-ancestor "$AUTH" "$REF" || die "Le commit ${REF} ne contient pas l'authentification simple ${AUTH}."
assert_descendant "$APP" "$REF"
shown=$(git_in "$APP" show "${REF}:prisma/migrations/${MIGRATION}/migration.sql" | sha256sum | awk '{print $1}')
[[ "$shown" == "$MIGRATION_SHA" ]] || die "La migration du commit n'est pas celle qui a été relue."
shown_access=$(git_in "$APP" show "${REF}:prisma/migrations/${MIGRATION_ACCESS}/migration.sql" | sha256sum | awk '{print $1}')
[[ "$shown_access" == "$MIGRATION_ACCESS_SHA" ]] || die "La migration d'accès aux comptes n'est pas celle qui a été relue."

fail() {
  echo "Étape ${step} : $1" >&2
  rollback 1
}

BK=
PREV=
ROLLBACK_DONE=0
rollback() {
  local code="${1:-1}" restored
  if [[ "$ROLLBACK_DONE" == 1 ]]; then exit "$code"; fi
  ROLLBACK_DONE=1
  if [[ "$step" == "sauvegarde" || "$step" == "sauvegarde_base" || "$step" == "ancetre" || "$step" == "integrite" || "$step" == "base" || "$step" == "droits" || "$step" == "schema" ]]; then
    echo "Échec à l'étape ${step}. L'application en service n'a pas été modifiée." >&2
    echo "Dump, s'il existe : ${DUMP:-aucun}" >&2
    exit "$code"
  fi
  echo "Échec à l'étape ${step}. Retour au commit ${PREV:-inconnu}." >&2
  systemctl stop wagesse-preprod.service || true
  if [[ -n "${PREV:-}" ]]; then
    git_in "$APP" checkout --detach "$PREV" || echo "Le retour Git a échoué." >&2
  fi
  if [[ -n "${BK:-}" && -f "$BK/runtime.tar" ]]; then
    tar -C "$APP" -xf "$BK/runtime.tar" || echo "La restauration des fichiers a échoué." >&2
  fi
  if [[ -n "${BK:-}" && -f "$BK/preprod.env" ]]; then
    cp -a "$BK/preprod.env" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
  systemctl start wagesse-preprod.service || true
  sleep 2
  restored=$(git_in "$APP" rev-parse HEAD 2>/dev/null || true)
  echo "Commit effectivement installé : ${restored:-inconnu}" >&2
  echo "Sauvegarde applicative : ${BK:-aucune}" >&2
  echo "La base n'a pas été restaurée. Dump : ${DUMP:-aucun}" >&2
  exit "$code"
}
trap 'rollback $?' ERR

step=sauvegarde
BK=/var/backups/wagesse-preprod/rollback-monetisation-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 /var/backups/wagesse-preprod
install -d -m 700 "$BK"
PREV=$(git_in "$APP" rev-parse HEAD)
printf '%s\n' "$PREV" > "$BK/commit"
cp -a "$ENV_FILE" "$BK/preprod.env"
chmod 600 "$BK/preprod.env"
avail=$(df -Pk /var/backups | awk 'NR==2 {print $4}')
need=$(du -sk "$APP/node_modules" "$APP/.next" | awk '{s+=$1} END {print s}')
if [[ "$avail" -lt $((need + 512000)) ]]; then
  BK=
  die "Espace insuffisant pour la sauvegarde. Arrêt avant modification."
fi
tar -C "$APP" -cf "$BK/runtime.tar" .next node_modules
echo "Sauvegarde applicative : $BK (commit ${PREV})."

step=droits
[[ "$(stat -c '%U' "$APP")" == "wagesse" ]] || fail "Le dépôt applicatif n'appartient pas à wagesse."
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] || fail "Le fichier d'environnement n'est pas en mode 600."
runuser -u wagesse -- test -r "$APP/package.json"
runuser -u wagesse -- test -w "$APP"
echo "Compte wagesse et permissions acceptés."

step=sauvegarde_base
restore_log=$(mktemp)
bash "$DIR/restore-check.sh" | tee "$restore_log"
DUMP=$(awk '/^Dump conservé : / { print $4 }' "$restore_log" | tail -1)
rm -f "$restore_log"
[[ -n "$DUMP" && -s "$DUMP" ]] || fail "La sauvegarde MariaDB n'a pas été contrôlée."
cp -a "$DUMP" "$BK/wagesse_preprod.sql.gz"
chmod 600 "$BK/wagesse_preprod.sql.gz"
echo "Dump contrôlé puis copié : $BK/wagesse_preprod.sql.gz"

step=schema
git_in "$APP" merge-base --is-ancestor "$PREV" "$REF" || fail "Le commit ${REF} ne prolonge pas la préproduction ${PREV}."
pending=$(git_in "$APP" diff --name-only "$PREV" "$REF" -- prisma/migrations)
[[ -n "$pending" ]] || fail "Aucune migration entre ${PREV} et ${REF}."
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  case "$file" in
    "prisma/migrations/${MIGRATION}/migration.sql"|"prisma/migrations/${MIGRATION_ACCESS}/migration.sql") ;;
    *) fail "Migration inattendue : ${file}" ;;
  esac
done <<< "$pending"
echo "Migrations relues entre ${PREV} et ${REF} : ${pending}"

step=code
git_in "$APP" checkout --detach "$REF"
actual=$(git_in "$APP" rev-parse HEAD)
[[ "$actual" == "$REF" ]] || fail "HEAD ${actual} différent de ${REF}."

step=migration
status_file=$(mktemp)
set +e
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  DATABASE_URL="$db_url" \
  bash -c 'set -euo pipefail; cd "$1"; npx prisma migrate status --schema prisma/schema.prisma' \
  bash "$APP" >"$status_file" 2>&1
status_code=$?
set -e
secret_filter < "$status_file"
if grep -q "Database schema is up to date" "$status_file"; then
  echo "Migration déjà appliquée."
else
  names=$(grep -oE '[0-9]{14}_[a-z0-9_]+' "$status_file" | sort -u)
  [[ -n "$names" ]] || fail "Migrations en attente refusées : vide."
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    case "$name" in
      "$MIGRATION"|"$MIGRATION_ACCESS") ;;
      *) fail "Migrations en attente refusées : ${name}" ;;
    esac
  done <<< "$names"
  [[ "$status_code" -ne 0 ]] || fail "L'état des migrations est ambigu."
  runuser -u wagesse -- env -i \
    HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
    DATABASE_URL="$db_url" \
    bash -c 'set -euo pipefail; cd "$1"; npx prisma migrate deploy --schema prisma/schema.prisma' \
    bash "$APP" 2>&1 | secret_filter
fi
rm -f "$status_file"
unset db_url

step=dependances
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  bash -c 'set -euo pipefail; cd "$1"; npm ci --no-audit --no-fund; npx prisma generate --schema prisma/schema.prisma' \
  bash "$APP" 2>&1 | secret_filter

step=compilation
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  NODE_OPTIONS=--max-old-space-size=2048 \
  bash -c 'set -euo pipefail; cd "$1"; npm run build' \
  bash "$APP"

step=redemarrage
systemctl restart wagesse-preprod.service
ready=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:3020/ >/dev/null; then
    ready=1
    break
  fi
  systemctl is-active --quiet wagesse-preprod.service || fail "Le service s'est arrêté pendant le démarrage."
  sleep 2
done
[[ "$ready" == 1 ]] || fail "WAGESSE ne répond pas sur 127.0.0.1:3020."
listeners=$(ss -ltnH 'sport = :3020' | awk '{print $4}' | sort -u)
[[ "$listeners" == "127.0.0.1:3020" ]] || fail "Écoute inattendue : ${listeners}."

installed=$(git_in "$APP" rev-parse HEAD)
[[ "$installed" == "$REF" ]] || fail "commit en service ${installed} différent de ${REF}"
trap - ERR
echo "Commit effectivement installé : ${installed}"
echo "Préproduction redémarrée. Sauvegarde : $BK"
echo "Dump contrôlé : $BK/wagesse_preprod.sql.gz"
other_failed=0
for url in https://ecom-touch.tech/ https://preprod.ecomschool.fr/ https://wendyam-finance.com/ https://tme-machinery.com/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)
  echo "$code $url"
  [[ "$code" == "200" ]] || other_failed=1
done
if [[ "$other_failed" == 1 ]]; then
  echo "Un autre site n'a pas répondu 200. WAGESSE n'est pas revenu en arrière." >&2
  exit 2
fi
