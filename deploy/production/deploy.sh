#!/usr/bin/env bash
# Deploy one validated commit to the dedicated production app.
# It does not touch preproduction, other vhosts, or copy any database.
#
#   WAGESSE_PRODUCTION_AUTHORIZE=yes bash deploy/production/deploy.sh <commit>
set -euo pipefail

die() { echo "$1" >&2; exit "${2:-1}"; }
[[ "${WAGESSE_PRODUCTION_AUTHORIZE:-}" == "yes" ]] || die "Autorisation absente. Relancer avec WAGESSE_PRODUCTION_AUTHORIZE=yes."
[[ "$(id -u)" -eq 0 ]] || die "Ce script doit être lancé en root."

REF="${1:-}"
[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "Commit complet de 40 caractères requis."

APP=/opt/wagesse-prod/app
ENV_FILE=/etc/wagesse/production.env
SERVICE=wagesse-prod.service
NODE=/opt/wagesse-prod/.node/bin/node
PORT=3030
DIR=$(cd "$(dirname "$0")" && pwd)

[[ -d "$APP/.git" && -s "$ENV_FILE" && -x "$NODE" ]] || die "Production absente. Terminer l'installation avant ce déploiement."
"$NODE" "$DIR/assert-env.mjs" "$ENV_FILE" >/dev/null

owner=$(stat -c '%U' "$APP")
[[ "$owner" == "wagesse-prod" ]] || die "Le dépôt de production n'appartient pas à wagesse-prod."
home=$(getent passwd "$owner" | awk -F: '{print $6}')
git_in() {
  runuser -u "$owner" -- env -i HOME="$home" PATH="/usr/bin:/bin" GIT_TERMINAL_PROMPT=0 git -C "$APP" "$@"
}

BK=/var/backups/wagesse-prod/rollback-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 /var/backups/wagesse-prod
install -d -m 700 "$BK"
PREV=$(git_in rev-parse HEAD)
printf '%s\n' "$PREV" > "$BK/commit"
cp -a "$ENV_FILE" "$BK/production.env"
chmod 600 "$BK/production.env"
if [[ -d "$APP/.next" && -d "$APP/node_modules" ]]; then
  tar -C "$APP" -cf "$BK/runtime.tar" .next node_modules
fi
echo "Sauvegarde : $BK (commit ${PREV}). La base n'est pas copiée."

rollback() {
  local code=$?
  trap - ERR
  [[ "$code" -eq 0 ]] && return 0
  echo "Retour au commit ${PREV}." >&2
  git_in checkout --detach "$PREV" || true
  if [[ -f "$BK/runtime.tar" ]]; then
    tar -C "$APP" -xf "$BK/runtime.tar" || true
  fi
  cp -a "$BK/production.env" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  chown -R "$owner:$owner" "$APP" || true
  systemctl restart "$SERVICE" || true
  echo "Commit conservé : $(git_in rev-parse HEAD 2>/dev/null || echo inconnu)" >&2
  echo "La base n'a pas été restaurée." >&2
  exit "$code"
}
trap rollback ERR

git_in fetch --no-tags origin "$REF"
git_in checkout --detach "$REF"
[[ "$(git_in rev-parse HEAD)" == "$REF" ]] || die "Le commit installé n'est pas ${REF}."
schema=$(git_in diff --name-only "$PREV" "$REF" -- prisma/schema.prisma prisma/migrations || true)
if [[ -n "$schema" ]]; then
  echo "Migrations présentes. prisma migrate deploy sera lancé sur la base de production seulement."
fi

runuser -u "$owner" -- env -i \
  HOME="$home" \
  PATH="/opt/wagesse-prod/.node/bin:/usr/bin:/bin" \
  bash -c 'set -euo pipefail; cd "$1"; npm ci --no-audit --no-fund; npx prisma generate --schema prisma/schema.prisma; npx prisma migrate deploy --schema prisma/schema.prisma; npm run build' \
  _ "$APP"
chown -R "$owner:$owner" "$APP"
systemctl restart "$SERVICE"
sleep 3
curl -fsS --max-time 15 "http://127.0.0.1:${PORT}/" >/dev/null || die "La production ne répond pas sur 127.0.0.1:${PORT}."
echo "Production en service sur ${REF}."
echo "Sauvegarde conservée : $BK"
