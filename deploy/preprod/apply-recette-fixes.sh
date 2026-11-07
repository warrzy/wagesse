#!/usr/bin/env bash
# Rebuilds only WAGESSE preproduction. On build or startup failure, restores
# the previous commit, runtime files and environment, then restarts that build.
# It does not edit nginx and does not restart another application.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh deploy <commit>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root
step=integrite
verify_script_sums "$DIR"

REF="${1:-}"
[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "Commit complet requis."

APP=/opt/wagesse-preprod/app
ENV_FILE=/etc/wagesse/preprod.env
NODE_BIN=/opt/wagesse-preprod/.node/bin
[[ -d "$APP/.git" && -x "$NODE_BIN/node" && -f "$ENV_FILE" ]] || die "Préproduction incomplète. Arrêt avant modification."

step=base
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
assert_preprod_database
unset DATABASE_URL

step=ancetre
git_in "$APP" fetch --no-tags origin "$EXPECTED_BASE" || die "Impossible de lire le commit de référence ${EXPECTED_BASE}."
assert_descendant "$APP" "$EXPECTED_BASE"

fail() {
  echo "$1" >&2
  rollback 1
}

BK=
PREV=
ROLLBACK_DONE=0
rollback() {
  local code="${1:-1}"
  if [[ "$ROLLBACK_DONE" == 1 ]]; then exit "$code"; fi
  ROLLBACK_DONE=1
  if [[ "$step" == "sauvegarde" || "$step" == "ancetre" || "$step" == "integrite" || "$step" == "base" ]]; then
    echo "Échec à l'étape ${step}. L'application en service n'a pas été modifiée." >&2
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
  if curl -fsS --max-time 5 http://127.0.0.1:3020/ >/dev/null; then
    echo "L'application précédente répond à nouveau." >&2
  else
    echo "L'application précédente ne répond pas." >&2
  fi
  journalctl -u wagesse-preprod.service -n 40 --no-pager -o cat 2>/dev/null | secret_filter >&2 || true
  echo "Sauvegarde conservée : ${BK:-aucune}" >&2
  exit "$code"
}
trap 'rollback $?' ERR

step=sauvegarde
BK=/var/backups/wagesse-preprod/rollback-$(date -u +%Y%m%dT%H%M%SZ)
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
  die "Espace insuffisant pour la sauvegarde (${avail} Ko libres, ${need} Ko requis). Arrêt avant modification."
fi
tar -C "$APP" -cf "$BK/runtime.tar" .next node_modules
echo "Sauvegarde applicative : $BK (commit ${PREV})."

step=drapeau
ensure_preprod_flag() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    grep -q "^${key}=${value}$" "$ENV_FILE" || fail "Valeur inattendue pour ${key}. Arrêt avant déploiement."
    return
  fi
  printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
}
ensure_preprod_flag WAGESSE_DEPLOYMENT preprod
ensure_preprod_flag PREPROD_TEST_PHONE_VERIFY true
chmod 600 "$ENV_FILE"

step=code
git_in "$APP" fetch --no-tags origin "$REF"
git_in "$APP" checkout --detach "$REF"
actual=$(git_in "$APP" rev-parse HEAD)
[[ "$actual" == "$REF" ]] || fail "HEAD ${actual} différent de ${REF}."
git_in "$APP" merge-base --is-ancestor "$EXPECTED_BASE" "$REF" || fail "Le commit ${REF} ne contient pas ${EXPECTED_BASE}."

step=dependances
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  npm --prefix "$APP" ci --no-audit --no-fund

step=compilation
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  NODE_OPTIONS=--max-old-space-size=2048 \
  npm --prefix "$APP" run build

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

trap - ERR
echo "WAGESSE préproduction redémarrée sur $REF"
echo "Sauvegarde conservée pour un retour manuel : $BK"
curl -sI --max-time 15 https://preprod.wagesse.fr/ | awk 'BEGIN{IGNORECASE=1} /^HTTP|strict-transport|x-content-type|x-frame|referrer-policy|x-powered-by/'
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
