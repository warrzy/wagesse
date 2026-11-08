#!/usr/bin/env bash
# Replays the simple-auth business path on preproduction. New fictional
# accounts are created through signup. The recette administrator is only used
# to approve one manual payment. Passwords are not printed, and the fictional
# phone verification is not used.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple-cycle <commit>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root
verify_script_sums "$DIR"

REF="${1:-}"
AUTH=d01574087fcbf740e7d9bd5ea4f715a32f7ed113
APP=/opt/wagesse-preprod/app
ENC=/etc/wagesse/recette-accounts.enc
PASS=/root/wagesse-recette.passphrase
NODE=/opt/wagesse-preprod/.node/bin/node
[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "Commit déployé requis. Cycle arrêté avant toute création de compte."
[[ -d "$APP/.git" && -s "$ENC" && -s "$PASS" && -x "$NODE" ]] || die "Préproduction ou registre de recette absent. Ne pas relancer la rotation."

actual=$(git_in "$APP" rev-parse HEAD)
[[ "$actual" == "$REF" ]] || die "HEAD ${actual} différent du commit requis ${REF}. Cycle arrêté."
git_in "$APP" merge-base --is-ancestor "$AUTH" "$actual" || die "Le commit déployé ne contient pas l'authentification simple. Cycle arrêté."

policy_file=$(mktemp /dev/shm/wagesse-policy.XXXXXX)
policy_code=$(curl -sS -o "$policy_file" -w '%{http_code}' --max-time 10 http://127.0.0.1:3020/api/auth/phone-verification || true)
if [[ "$policy_code" == "404" ]]; then
  rm -f "$policy_file"
  die "GET /api/auth/phone-verification HTTP 404"
fi
[[ "$policy_code" == "200" ]] || { rm -f "$policy_file"; die "GET /api/auth/phone-verification HTTP ${policy_code}"; }
node - "$policy_file" <<'PY' || { rm -f "$policy_file"; die "La préproduction n'est pas en mode simple. Cycle arrêté."; }
const fs = require("fs")
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
if (!body.data || body.data.required !== false) process.exit(1)
PY
rm -f "$policy_file"

umask 077
tmp=$(mktemp /dev/shm/wagesse-auth-simple.XXXXXX)
log=$(mktemp /dev/shm/wagesse-auth-simple-log.XXXXXX)
cleanup() {
  shred -u "$tmp" "$log" 2>/dev/null || rm -f "$tmp" "$log"
}
trap cleanup EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$ENC" -out "$tmp" -pass "file:$PASS"

set +e
"$NODE" "$DIR/auth-simple-cycle.mjs" "$tmp" > "$log" 2>&1
code=$?
set -e
secret_filter < "$log"
if [[ "$code" != 0 ]]; then
  die "Cycle du mode simple interrompu." "$code"
fi

mission=$(awk '/^MISSION / { print $2 }' "$log")
[[ "$mission" =~ ^c[a-z0-9]+$ ]] || die "Identifiant de mission illisible."
status=$(mysql -N wagesse_preprod -e "SELECT status FROM Mission WHERE id='${mission}'")
echo "Mission ${mission} en base : ${status}"
[[ "$status" == "COMPLETED" ]] || die "La mission n'est pas terminée."

while read -r phone; do
  [[ "$phone" =~ ^781[0-9]{5}$ ]] || die "Numéro de cycle inattendu."
  verified=$(mysql -N wagesse_preprod -e "SELECT IF(phoneVerified IS NULL, 'NULL', 'SET') FROM User WHERE phone='${phone}'")
  [[ "$verified" == "NULL" ]] || die "Un téléphone du mode simple a été marqué vérifié."
done < <(awk '/^PHONE / { print $3 }' "$log")
echo "Téléphones du cycle laissés non vérifiés."
echo "Cycle du mode simple terminé."
