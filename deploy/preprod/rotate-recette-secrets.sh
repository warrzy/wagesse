#!/usr/bin/env bash
# Rotates the four fictional passwords and creates or refreshes the recette
# administrator. The registry goes to /etc/wagesse/recette-accounts.enc.
# The passphrase goes only to /root/wagesse-recette.passphrase.
# Nothing is printed. Existing administrators are left unchanged.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh rotate
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root
step=integrite
verify_script_sums "$DIR"

APP=/opt/wagesse-preprod/app
NODE=/opt/wagesse-preprod/.node/bin/node
ENV_FILE=/etc/wagesse/preprod.env
OUT=/etc/wagesse/recette-accounts.enc
PASS_FILE=/root/wagesse-recette.passphrase
SCRIPT="$DIR/rotate-recette-accounts.mjs"
RUNTIME=/opt/wagesse-preprod/rotate-recette-accounts.mjs

[[ -f "$ENV_FILE" ]] || die "Fichier d'environnement absent. Arrêt."
[[ -x "$NODE" ]] || die "Node de préproduction absent. Arrêt."
[[ -d "$APP/node_modules/@prisma/client" ]] || die "Client Prisma absent. Arrêt."
[[ -f "$SCRIPT" ]] || die "Script de rotation absent. Arrêt."

step=base
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
assert_preprod_database

umask 077
tmp=$(mktemp /dev/shm/wagesse-recette.XXXXXX)
passfile=$(mktemp /dev/shm/wagesse-pass.XXXXXX)
keep_registry=0
cleanup() {
  if [[ "$keep_registry" == 1 ]]; then
    install -m 600 "$tmp" /root/wagesse-recette-registry.json
    rm -f "$passfile"
    echo "Chiffrement interrompu. Registre conservé pour root : /root/wagesse-recette-registry.json" >&2
    rm -f "$tmp"
    return
  fi
  shred -u "$tmp" "$passfile" 2>/dev/null || rm -f "$tmp" "$passfile"
  rm -f "$RUNTIME"
}
trap cleanup EXIT

step=rotation
install -m 640 -o wagesse -g wagesse "$SCRIPT" "$RUNTIME"
if ! runuser -u wagesse -- env -i \
  HOME=/opt/wagesse-preprod \
  PATH=/opt/wagesse-preprod/.node/bin:/usr/bin:/bin \
  DATABASE_URL="$DATABASE_URL" \
  NODE_PATH="$APP/node_modules" \
  "$NODE" "$RUNTIME" > "$tmp"; then
  die "Rotation refusée à l'étape ${step}. Aucun registre n'est écrit."
fi

step=controle
if ! node -e '
const fs = require("fs")
const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const phones = ["78001021", "78001022", "78002021", "78002022", "78003021"]
if (data.replaced !== 4 || data.existingAdminsUnchanged !== true) process.exit(1)
if (!Array.isArray(data.accounts) || data.accounts.length !== 5) process.exit(1)
const got = new Set(data.accounts.map((account) => account.phone))
if (phones.some((phone) => !got.has(phone))) process.exit(1)
const passwords = data.accounts.map((account) => account.password)
if (passwords.some((password) => typeof password !== "string" || password.length < 20)) process.exit(1)
if (new Set(passwords).size !== 5) process.exit(1)
const admin = data.accounts.find((account) => account.phone === "78003021")
if (!admin || admin.role !== "ADMIN") process.exit(1)
if (data.accounts.some((account) => account.phone !== "78003021" && (account.role === "ADMIN" || account.role === "SUPER_ADMIN"))) process.exit(1)
process.stdout.write(String(data.existingAdminCount))
' "$tmp" > /tmp/wagesse-recette-admin-count; then
  keep_registry=1
  die "Contrôle du registre refusé à l'étape ${step}."
fi
admin_count=$(cat /tmp/wagesse-recette-admin-count)
rm -f /tmp/wagesse-recette-admin-count

step=chiffrement
keep_registry=1
phrase=$(openssl rand -base64 32)
printf '%s' "$phrase" > "$passfile"
install -m 600 /dev/null "$OUT"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -in "$tmp" -out "$OUT" -pass "file:$passfile"
chown root:root "$OUT"
chmod 600 "$OUT"
install -m 600 /dev/null "$PASS_FILE"
printf '%s\n' "$phrase" > "$PASS_FILE"
unset phrase
[[ "$(dirname "$OUT")" != "$(dirname "$PASS_FILE")" ]] || die "Le registre et la phrase secrète sont dans le même dossier."
[[ -s "$OUT" && -s "$PASS_FILE" ]] || die "Fichier chiffré vide."
keep_registry=0

rm -f /home/wagesse-deploy/comptes-recette.enc /home/wagesse-deploy/wagesse-recette.passphrase
echo "Rotation terminée. 4 anciens hachages remplacés. Administrateur de recette 78003021 enregistré dans le registre chiffré. Administrateurs préexistants inchangés : ${admin_count}."
echo "Registre : $OUT"
echo "Phrase secrète : $PASS_FILE"
