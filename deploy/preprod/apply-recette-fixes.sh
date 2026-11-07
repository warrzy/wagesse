#!/usr/bin/env bash
# Rebuilds only the WAGESSE preproduction app and restarts its service.
# It does not edit nginx and does not restart another application.
#
# Do not run until the owner has authorized this privileged operation:
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/apply-recette-fixes.sh <commit>
set -euo pipefail

if [[ "${WAGESSE_PREPROD_AUTHORIZE:-}" != "yes" ]]; then
  echo "Autorisation absente. Relancer avec WAGESSE_PREPROD_AUTHORIZE=yes." >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ce script doit être lancé en root." >&2
  exit 1
fi

REF="${1:-}"
if [[ ! "$REF" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Commit complet requis." >&2
  exit 1
fi

APP=/opt/wagesse-preprod/app
ENV_FILE=/etc/wagesse/preprod.env
NODE=/opt/wagesse-preprod/.node/bin/node
NPM=/opt/wagesse-preprod/.node/bin/npm

[[ -d "$APP/.git" && -x "$NODE" && -f "$ENV_FILE" ]]

if ! grep -q '^PREPROD_TEST_PHONE_VERIFY=true$' "$ENV_FILE"; then
  printf '\nPREPROD_TEST_PHONE_VERIFY=true\n' >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

sudo -u wagesse env HOME=/opt/wagesse-preprod GIT_TERMINAL_PROMPT=0 \
  git -C "$APP" fetch --no-tags origin "$REF"
sudo -u wagesse env HOME=/opt/wagesse-preprod GIT_TERMINAL_PROMPT=0 \
  git -C "$APP" checkout --detach "$REF"
sudo -u wagesse env HOME=/opt/wagesse-preprod \
  "$NPM" --prefix "$APP" ci --no-audit --no-fund
sudo -u wagesse env HOME=/opt/wagesse-preprod \
  "$NPM" --prefix "$APP" run build

systemctl restart wagesse-preprod.service

ready=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:3020/ >/dev/null; then
    ready=1
    break
  fi
  systemctl is-active --quiet wagesse-preprod.service || exit 1
  sleep 2
done
[[ "$ready" == 1 ]]

bind=$(ss -ltnH 'sport = :3020' | awk '{print $4}')
echo "$bind" | grep -q '127.0.0.1:3020'

echo "WAGESSE préproduction redémarrée sur $REF"
curl -sI --max-time 15 https://preprod.wagesse.fr/ | awk 'BEGIN{IGNORECASE=1} /^HTTP|strict-transport|x-content-type|x-frame|referrer-policy|x-powered-by/'
for url in https://ecom-touch.tech/ https://preprod.ecomschool.fr/ https://wendyam-finance.com/ https://tme-machinery.com/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)
  echo "$code $url"
done
