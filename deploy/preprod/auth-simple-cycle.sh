#!/usr/bin/env bash
# Replays the simple-auth business path on preproduction. New fictional
# accounts are created through signup. The recette administrator is only used
# to approve one manual payment. Passwords are not printed, and the fictional
# phone verification is not used.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple-cycle
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root
verify_script_sums "$DIR"

ENC=/etc/wagesse/recette-accounts.enc
PASS=/root/wagesse-recette.passphrase
NODE=/opt/wagesse-preprod/.node/bin/node
[[ -s "$ENC" && -s "$PASS" && -x "$NODE" ]] || die "Registre de recette absent. Ne pas relancer la rotation."

policy=$(curl -fsS --max-time 10 http://127.0.0.1:3020/api/auth/phone-verification)
node -e 'const b=JSON.parse(process.argv[1]); if (!b.data || b.data.required !== false) process.exit(1)' "$policy" \
  || die "La préproduction n'est pas en mode simple. Cycle arrêté."

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
