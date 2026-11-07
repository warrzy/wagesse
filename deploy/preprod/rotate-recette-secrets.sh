#!/usr/bin/env bash
# Rotates the fictional recette passwords and stores the new registry
# at /etc/wagesse/recette-accounts.enc. The passphrase is written only
# to /root/wagesse-recette.passphrase and is not printed.
#
# Do not run until the owner has authorized this privileged operation:
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/rotate-recette-secrets.sh
set -euo pipefail

if [[ "${WAGESSE_PREPROD_AUTHORIZE:-}" != "yes" ]]; then
  echo "Autorisation absente. Relancer avec WAGESSE_PREPROD_AUTHORIZE=yes." >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ce script doit être lancé en root." >&2
  exit 1
fi

APP=/opt/wagesse-preprod/app
NODE=/opt/wagesse-preprod/.node/bin/node
ENV_FILE=/etc/wagesse/preprod.env
OUT=/etc/wagesse/recette-accounts.enc
SCRIPT="$(cd "$(dirname "$0")" && pwd)/rotate-recette-accounts.mjs"

[[ -f "$ENV_FILE" && -x "$NODE" && -d "$APP/node_modules/@prisma/client" && -f "$SCRIPT" ]]

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]]

umask 077
tmp=$(mktemp /dev/shm/wagesse-recette.XXXXXX)
passfile=$(mktemp /dev/shm/wagesse-pass.XXXXXX)
cleanup() {
  shred -u "$tmp" "$passfile" 2>/dev/null || rm -f "$tmp" "$passfile"
}
trap cleanup EXIT

sudo --preserve-env=DATABASE_URL -u wagesse \
  env HOME=/opt/wagesse-preprod NODE_PATH="$APP/node_modules" \
  "$NODE" "$SCRIPT" > "$tmp"

phrase=$(openssl rand -base64 32)
printf '%s' "$phrase" > "$passfile"
install -m 600 /dev/null "$OUT"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -in "$tmp" -out "$OUT" -pass "file:$passfile"
chown root:root "$OUT"
chmod 600 "$OUT"

rm -f /home/wagesse-deploy/comptes-recette.enc /home/wagesse-deploy/wagesse-recette.passphrase

install -m 600 /dev/null /root/wagesse-recette.passphrase
printf '%s\n' "$phrase" > /root/wagesse-recette.passphrase
unset phrase
echo "Registre chiffré : $OUT"
echo "Phrase secrète : /root/wagesse-recette.passphrase"
