#!/usr/bin/env bash
# Replays the blocked preproduction scenarios. Passwords stay in a root-only
# temporary file and are not printed.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh cycle
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
[[ -s "$ENC" && -s "$PASS" && -x "$NODE" ]] || die "Registre de recette absent. Lancer d'abord la rotation."

umask 077
tmp=$(mktemp /dev/shm/wagesse-cycle.XXXXXX)
log=$(mktemp /dev/shm/wagesse-cycle-log.XXXXXX)
cleanup() {
  shred -u "$tmp" 2>/dev/null || rm -f "$tmp"
}
trap cleanup EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$ENC" -out "$tmp" -pass "file:$PASS"

set +e
"$NODE" "$DIR/recette-cycle.mjs" "$tmp" > "$log" 2>&1
code=$?
set -e
secret_filter < "$log"
if [[ "$code" != 0 ]]; then
  die "Cycle interrompu. Diagnostic ci-dessus." "$code"
fi

mission=$(awk '/^MISSION / { print $2 }' "$log")
[[ "$mission" =~ ^c[a-z0-9]+$ ]] || die "Identifiant de mission illisible."
status=$(mysql -N wagesse_preprod -e "SELECT status FROM Mission WHERE id='${mission}'")
echo "Mission ${mission} en base : ${status}"
[[ "$status" == "COMPLETED" ]] || die "La mission n'est pas terminée."
rm -f "$log"
echo "Cycle de recette terminé."
