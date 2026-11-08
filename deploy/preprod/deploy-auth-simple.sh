#!/usr/bin/env bash
# Deploys simple authentication on WAGESSE preproduction only.
# It keeps the database, the accounts and the SMS/OTP code. On failure it
# restores the previous application files and environment, then restarts only
# wagesse-preprod. It does not migrate, rotate passwords, or call the
# fictional phone verification.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root

LIVE=627cb4fc0fcd014e8743db2249b1887fe71dd173
AUTH=d01574087fcbf740e7d9bd5ea4f715a32f7ed113
APP=/opt/wagesse-preprod/app
ENV_FILE=/etc/wagesse/preprod.env
NODE_BIN=/opt/wagesse-preprod/.node/bin
REF="${1:-}"

step=integrite
[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "Commit complet requis."
bash "$DIR/preflight.sh" "$REF"

[[ -d "$APP/.git" && -x "$NODE_BIN/node" && -f "$ENV_FILE" ]] || die "Préproduction incomplète. Arrêt avant modification."

step=base
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
assert_preprod_database
unset DATABASE_URL
grep -q '^OTP_DEBUG_RETURN=true$' "$ENV_FILE" && die "OTP_DEBUG_RETURN est ouvert. Arrêt avant modification."
grep -q '^SMS_ALLOW_SIMULATE=true$' "$ENV_FILE" && die "La simulation SMS est ouverte. Arrêt avant modification."

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
  if [[ "$step" == "sauvegarde" || "$step" == "ancetre" || "$step" == "integrite" || "$step" == "base" || "$step" == "droits" || "$step" == "schema" ]]; then
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
  echo "La base MariaDB n'a pas été restaurée ni réinitialisée." >&2
  exit "$code"
}
trap 'rollback $?' ERR

step=sauvegarde
BK=/var/backups/wagesse-preprod/rollback-auth-simple-$(date -u +%Y%m%dT%H%M%SZ)
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
echo "Sauvegarde applicative : $BK (commit ${PREV}). La base n'est pas copiée ni modifiée."

step=droits
[[ "$(stat -c '%U' "$APP")" == "wagesse" ]] || fail "Le dépôt applicatif n'appartient pas à wagesse."
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] || fail "Le fichier d'environnement n'est pas en mode 600."
runuser -u wagesse -- test -r "$APP/package.json"
runuser -u wagesse -- test -w "$APP"
runuser -u wagesse -- test -x "$NODE_BIN/node"
echo "Compte wagesse et permissions acceptés."

step=schema
if [[ "$PREV" != "$LIVE" ]]; then
  git_in "$APP" merge-base --is-ancestor "$AUTH" "$PREV" || fail "HEAD actuel ${PREV} différent de la préproduction connue ${LIVE}."
fi
git_in "$APP" fetch --no-tags origin "$REF"
git_in "$APP" cat-file -e "${REF}^{commit}"
git_in "$APP" merge-base --is-ancestor "$LIVE" "$REF" || fail "Le commit ${REF} ne contient pas la préproduction ${LIVE}."
git_in "$APP" merge-base --is-ancestor "$AUTH" "$REF" || fail "Le commit ${REF} ne contient pas l'authentification simple ${AUTH}."
schema_changes=$(git_in "$APP" diff --name-only "$PREV" "$REF" -- prisma/schema.prisma prisma/migrations)
[[ -z "$schema_changes" ]] || fail "Le commit modifie Prisma. Aucune migration n'est lancée."
echo "Schéma Prisma inchangé. Aucune migration."

step=drapeau
python3 - "$ENV_FILE" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
lines = path.read_text().splitlines()
found = False
out = []
for line in lines:
    if line.startswith("PHONE_VERIFICATION_REQUIRED="):
        out.append("PHONE_VERIFICATION_REQUIRED=false")
        found = True
    else:
        out.append(line)
if not found:
    out.append("PHONE_VERIFICATION_REQUIRED=false")
path.write_text("\n".join(out) + "\n")
PY
chmod 600 "$ENV_FILE"
grep -q '^PHONE_VERIFICATION_REQUIRED=false$' "$ENV_FILE" || fail "Le drapeau d'authentification n'a pas été posé."
echo "PHONE_VERIFICATION_REQUIRED=false"

step=code
git_in "$APP" checkout --detach "$REF"
actual=$(git_in "$APP" rev-parse HEAD)
[[ "$actual" == "$REF" ]] || fail "HEAD ${actual} différent de ${REF}."

step=dependances
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  bash -c 'set -euo pipefail; cd "$1"; npm ci --no-audit --no-fund; npx prisma generate --schema prisma/schema.prisma' \
  bash "$APP" 2>&1 | secret_filter

step=client_prisma
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  bash -c 'set -euo pipefail; cd "$1"; npx tsc --noEmit --pretty false --incremental false -p deploy/preprod/prisma-client-probe.tsconfig.json' \
  bash "$APP"

step=typescript
runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod PATH="$NODE_BIN:/usr/bin:/bin" \
  bash -c 'set -euo pipefail; cd "$1"; npm run typecheck' \
  bash "$APP"

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

step=politique
policy=$(mktemp /dev/shm/wagesse-policy.XXXXXX)
chmod 600 "$policy"
curl -fsS --max-time 10 http://127.0.0.1:3020/api/auth/phone-verification > "$policy"
node - "$policy" <<'PY' || fail "La politique publique n'est pas le mode simple."
import json, sys
raw = open(sys.argv[1], encoding="utf-8").read()
if "SMS_HTTP" in raw or "mysql://" in raw or "password" in raw.lower():
    sys.exit(1)
body = json.loads(raw)
data = body.get("data") or {}
if data.get("required") is not False or data.get("misconfigured") is not False:
    sys.exit(1)
PY
shred -u "$policy" 2>/dev/null || rm -f "$policy"
post_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST http://127.0.0.1:3020/api/auth/phone-verification)
[[ "$post_code" == "405" ]] || fail "La politique accepte une écriture publique (${post_code})."

step=https
curl -fsS --max-time 15 https://preprod.wagesse.fr/api/auth/phone-verification > /dev/shm/wagesse-policy-https.json
node - /dev/shm/wagesse-policy-https.json <<'PY' || fail "Le site HTTPS ne sert pas le mode simple."
import json, sys
raw = open(sys.argv[1], encoding="utf-8").read()
data = json.loads(raw).get("data") or {}
if data.get("required") is not False:
    sys.exit(1)
PY
shred -u /dev/shm/wagesse-policy-https.json 2>/dev/null || rm -f /dev/shm/wagesse-policy-https.json
cert=$(openssl s_client -servername preprod.wagesse.fr -connect 127.0.0.1:443 </dev/null 2>/dev/null | openssl x509 -noout -checkend 86400 -ext subjectAltName || true)
[[ "$cert" == *preprod.wagesse.fr* ]] || fail "Le certificat HTTPS ne couvre pas preprod.wagesse.fr."

trap - ERR
echo "WAGESSE préproduction redémarrée sur $REF en authentification simple."
echo "Sauvegarde conservée pour un retour manuel : $BK"
echo "Ancienne sauvegarde à conserver : /var/backups/wagesse-preprod/rollback-20261107T214947Z"
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
