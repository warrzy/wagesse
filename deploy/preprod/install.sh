#!/usr/bin/env bash
# Installation isolée de WAGESSE sur preprod.wagesse.fr.
# N'arrête pas les autres applications, ne modifie pas leurs vhosts,
# n'écoute que sur 127.0.0.1:3020.
# Usage, sur le VPS, en root, depuis un clone de la branche :
#   ADMIN_PHONE=70XXXXXX CERTBOT_EMAIL=ops@example.com bash deploy/preprod/install.sh
set -euo pipefail

APP_USER=wagesse
APP_DIR=/opt/wagesse-preprod
ENV_DIR=/etc/wagesse
ENV_FILE="${ENV_DIR}/preprod.env"
BACKUP_DIR=/var/backups/wagesse-preprod
NGINX_SITE=/etc/nginx/sites-available/preprod.wagesse.fr
NGINX_LINK=/etc/nginx/sites-enabled/preprod.wagesse.fr
WEBROOT=/var/www/letsencrypt
PORT=3020
NODE_VERSION=22.23.4
REPO="${DEPLOY_REPO:-https://github.com/warrzy/wagesse.git}"
REF="${DEPLOY_REF:-91e8235de45f3dfd58be558dc4636147d2a7d8df}"
LOG=/var/log/wagesse-preprod-install.log
STATE=/tmp/wagesse-preprod-foreign-state.txt

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ce script doit être lancé en root." >&2
  exit 1
fi

if [[ -z "${ADMIN_PHONE:-}" || ! "${ADMIN_PHONE}" =~ ^[0-9]{8,15}$ ]]; then
  echo "ADMIN_PHONE requis : numéro de l'opérateur, 8 à 15 chiffres." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}" "${ENV_DIR}" "${WEBROOT}"
chmod 700 "${ENV_DIR}" "${BACKUP_DIR}"
touch "${LOG}"
chmod 600 "${LOG}"
exec > >(tee -a "${LOG}") 2>&1
echo "== WAGESSE préproduction $(date -Is) port ${PORT} =="

port_open() {
  local port="$1"
  ss -ltn | awk '{print $4}' | grep -Eq "(^|:|\\])${port}$"
}

snapshot_foreign() {
  {
    echo "-- listeners --"
    ss -ltnp || true
    echo "-- nginx checksums --"
    if compgen -G "/etc/nginx/sites-available/*" > /dev/null; then
      md5sum /etc/nginx/sites-available/* | grep -v "preprod.wagesse.fr" || true
    fi
    echo "-- units --"
    systemctl is-active nginx ssh postgresql pm2-deploy || true
  } > "${STATE}"
}

assert_foreign_still_up() {
  local missing=0
  local port
  for port in 22 80 443 3000 3001 3010 5432; do
    if ! port_open "${port}"; then
      echo "Le port ${port} ne répond plus. Arrêt sans toucher aux autres services." >&2
      missing=1
    fi
  done
  if [[ "${missing}" -ne 0 ]]; then
    if [[ -L "${NGINX_LINK}" ]]; then
      rollback_nginx
    fi
    exit 1
  fi
}

rollback_nginx() {
  rm -f "${NGINX_LINK}"
  if nginx -t; then
    systemctl reload nginx
  fi
  systemctl disable --now wagesse-preprod.service || true
  echo "Vhost WAGESSE retiré. Les autres fichiers nginx n'ont pas été modifiés." >&2
}

echo "-- Inventaire, aucune modification --"
. /etc/os-release
echo "OS ${PRETTY_NAME}"
nginx -v
command -v node && node -v || echo "node système absent, installation isolée prévue"
command -v psql && psql --version || true
ss -ltnp || true
df -h /
free -h || true
echo "-- Sauvegardes déjà présentes --"
ls -lah /var/backups /var/backups/wagesse-preprod 2>/dev/null || true
echo "Les applications existantes (ports 3000, 3001, 3010, PostgreSQL 5432) ne sont pas sauvegardées par ce script et ne sont pas redémarrées."

if [[ -e "${NGINX_SITE}" ]] && grep -Eq "ecom-touch|ecomschool|wendyam|tme-machinery" "${NGINX_SITE}"; then
  echo "Le fichier ${NGINX_SITE} mentionne une autre application. Abandon." >&2
  exit 1
fi

for port in 22 80 443 3000 3001 3010 5432; do
  if ! port_open "${port}"; then
    echo "Port attendu ${port} absent avant installation. Abandon sans changement." >&2
    exit 1
  fi
done
if ! port_open 5432; then
  echo "PostgreSQL n'écoute pas sur 5432. Abandon." >&2
  exit 1
fi

snapshot_foreign
tar -czf "${BACKUP_DIR}/nginx-$(date +%Y%m%d%H%M%S).tgz" /etc/nginx/sites-available /etc/nginx/sites-enabled
md5sum /etc/nginx/sites-available/* | grep -v "preprod.wagesse.fr" > /tmp/wagesse-nginx-before.txt || true

if ! id "${APP_USER}" >/dev/null 2>&1; then
  mkdir -p "${APP_DIR}"
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin --no-create-home "${APP_USER}"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}"
fi
home=$(getent passwd "${APP_USER}" | cut -d: -f6)
if [[ "${home}" != "${APP_DIR}" ]]; then
  echo "L'utilisateur ${APP_USER} existe déjà avec le home ${home}. Abandon." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-upgrade curl ca-certificates git
fi
if ! command -v mysql >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-upgrade mariadb-server
fi
systemctl enable --now mariadb
assert_foreign_still_up
exposed=$(ss -ltn | awk '{print $4}' | grep -E ':3306$' | grep -Ev '127\.0\.0\.1:3306|\[::1\]:3306' || true)
if [[ -n "${exposed}" ]]; then
  echo "MariaDB est exposé hors de localhost : ${exposed}. Abandon avant nginx." >&2
  exit 1
fi

if systemctl is-active --quiet wagesse-preprod.service; then
  systemctl stop wagesse-preprod.service
fi
if port_open "${PORT}"; then
  echo "Le port ${PORT} est occupé par un autre processus. Abandon." >&2
  ss -ltnp | grep ":${PORT}" || true
  exit 1
fi

install_node() {
  local dest="${APP_DIR}/.node"
  if [[ -x "${dest}/bin/node" ]]; then
    return
  fi
  mkdir -p "${APP_DIR}"
  local tarball="/tmp/node-v${NODE_VERSION}-linux-x64.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o "${tarball}"
  tar -xJf "${tarball}" -C /tmp
  rm -rf "${dest}"
  mv "/tmp/node-v${NODE_VERSION}-linux-x64" "${dest}"
  rm -f "${tarball}"
}

install_node
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/.node"

if [[ ! -d "${APP_DIR}/app/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO}" "${APP_DIR}/app"
fi
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/app"
sudo -u "${APP_USER}" git -C "${APP_DIR}/app" fetch origin
sudo -u "${APP_USER}" git -C "${APP_DIR}/app" checkout --detach "${REF}"
# Git refuse un dépôt dont le propriétaire n'est pas l'utilisateur courant.
deployed=$(sudo -u "${APP_USER}" git -C "${APP_DIR}/app" rev-parse HEAD)
printf '%s\n' "Commit déployé : ${deployed}" | tee "${ENV_DIR}/preprod-release.txt"
if [[ "${deployed}" != "${REF}" ]]; then
  echo "Le commit déployé n'est pas ${REF}." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  db_pass=$(openssl rand -base64 24 | tr -d '/+=\n' | head -c 32)
  jwt=$(openssl rand -base64 48 | tr -d '\n')
  mysql <<SQL
CREATE DATABASE IF NOT EXISTS wagesse_preprod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wagesse_preprod'@'localhost' IDENTIFIED BY '${db_pass}';
GRANT ALL PRIVILEGES ON wagesse_preprod.* TO 'wagesse_preprod'@'localhost';
FLUSH PRIVILEGES;
SQL
  umask 077
  cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Wagesse
NEXT_PUBLIC_APP_URL=https://preprod.wagesse.fr
NEXT_PUBLIC_CURRENCY=XOF
DATABASE_URL=mysql://wagesse_preprod:${db_pass}@127.0.0.1:3306/wagesse_preprod
JWT_SECRET=${jwt}
JWT_EXPIRATION=7d
PAYMENT_MODE=MANUAL
PAYDUNYA_ENABLED=false
PAYDUNYA_MASTER_KEY=
PAYDUNYA_PRIVATE_KEY=
PAYDUNYA_TOKEN=
PAYDUNYA_MODE=test
PAYMENT_PROVIDER=orange_money_production
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
ORANGE_MONEY_MERCHANT_KEY=
SMS_PROVIDER=http
SMS_HTTP_URL=
SMS_HTTP_KEY=
SMS_SENDER=WAGESSE
SMS_COUNTRY_CODE=226
SMS_ALLOW_SIMULATE=
OTP_DEBUG_RETURN=
SEED_DEMO_ACCOUNTS=false
PORT=${PORT}
EOF
  unset db_pass jwt
  chown root:"${APP_USER}" "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
else
  echo "Fichier ${ENV_FILE} conservé."
  if mysql -N -e "SHOW DATABASES LIKE 'wagesse_preprod'" | grep -q wagesse_preprod; then
    mysqldump --single-transaction wagesse_preprod | gzip > "${BACKUP_DIR}/wagesse_preprod-$(date +%Y%m%d%H%M%S).sql.gz"
    chmod 600 "${BACKUP_DIR}"/wagesse_preprod-*.sql.gz
  fi
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ "${PORT}" != "3020" ]]; then
  echo "PORT=${PORT} dans l'environnement. Seul 3020 est autorisé." >&2
  exit 1
fi

pushd "${APP_DIR}/app" >/dev/null
sudo -u "${APP_USER}" env PATH="${APP_DIR}/.node/bin:${PATH}" npm ci
sudo -u "${APP_USER}" env PATH="${APP_DIR}/.node/bin:${PATH}" npx prisma generate
sudo -u "${APP_USER}" env PATH="${APP_DIR}/.node/bin:${PATH}" DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy
sudo -u "${APP_USER}" env PATH="${APP_DIR}/.node/bin:${PATH}" DATABASE_URL="${DATABASE_URL}" SEED_DEMO_ACCOUNTS=false npm run seed
env PATH="${APP_DIR}/.node/bin:${PATH}" \
  DATABASE_URL="${DATABASE_URL}" ADMIN_PHONE="${ADMIN_PHONE}" \
  ADMIN_CREDENTIALS_PATH="${ENV_DIR}/preprod-admin.credentials" \
  node deploy/preprod/create-admin.mjs
chown root:root "${ENV_DIR}/preprod-admin.credentials"
chmod 600 "${ENV_DIR}/preprod-admin.credentials"
sudo -u "${APP_USER}" env PATH="${APP_DIR}/.node/bin:${PATH}" \
  NODE_OPTIONS="--max-old-space-size=2048" \
  DATABASE_URL="${DATABASE_URL}" JWT_SECRET="${JWT_SECRET}" \
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" PAYMENT_MODE=MANUAL \
  npm run build
popd >/dev/null
assert_foreign_still_up

cat > /etc/systemd/system/wagesse-preprod.service <<EOF
[Unit]
Description=WAGESSE préproduction
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/app
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/.node/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3020
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now wagesse-preprod.service
ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "${ready}" -ne 1 ]]; then
  echo "WAGESSE ne répond pas sur 127.0.0.1:${PORT}." >&2
  systemctl disable --now wagesse-preprod.service || true
  exit 1
fi
if ss -ltn | awk '{print $4}' | grep -E ':3020$' | grep -vq '127.0.0.1:3020'; then
  echo "WAGESSE n'est pas limité à 127.0.0.1:3020. Arrêt du service." >&2
  systemctl disable --now wagesse-preprod.service || true
  exit 1
fi
assert_foreign_still_up

collect_vhost_status() {
  local out="$1"
  : > "${out}"
  local name
  while read -r name; do
    [[ -z "${name}" || "${name}" == "_" || "${name}" == "preprod.wagesse.fr" ]] && continue
    local code
    code=$(curl -sk --resolve "${name}:443:127.0.0.1" --max-time 15 -o /dev/null -w "%{http_code}" "https://${name}/" || echo "000")
    echo "${name} ${code}" >> "${out}"
  done < <(grep -hE '^\s*server_name\s+' /etc/nginx/sites-enabled/* | sed -E 's/.*server_name\s+//; s/;//' | tr ' ' '\n' | sort -u)
}

collect_vhost_status /tmp/wagesse-vhosts-before.txt

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name preprod.wagesse.fr;

    location ^~ /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sfn "${NGINX_SITE}" "${NGINX_LINK}"
if ! nginx -t; then
  rm -f "${NGINX_LINK}" "${NGINX_SITE}"
  nginx -t
  systemctl disable --now wagesse-preprod.service || true
  exit 1
fi
systemctl reload nginx
assert_foreign_still_up

if [[ ! -f /etc/letsencrypt/live/preprod.wagesse.fr/fullchain.pem ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update
    apt-get install -y --no-upgrade certbot
  fi
  if [[ -d /etc/letsencrypt/accounts ]]; then
    certbot certonly --webroot -w "${WEBROOT}" -d preprod.wagesse.fr \
      --keep-until-expiring --non-interactive
  else
    certbot_mail=(--register-unsafely-without-email)
    if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
      certbot_mail=(-m "${CERTBOT_EMAIL}")
    fi
    certbot certonly --webroot -w "${WEBROOT}" -d preprod.wagesse.fr \
      --keep-until-expiring --non-interactive --agree-tos "${certbot_mail[@]}"
  fi
fi

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name preprod.wagesse.fr;

    location ^~ /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name preprod.wagesse.fr;

    ssl_certificate /etc/letsencrypt/live/preprod.wagesse.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preprod.wagesse.fr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

if ! nginx -t; then
  rollback_nginx
  exit 1
fi
systemctl reload nginx
assert_foreign_still_up
collect_vhost_status /tmp/wagesse-vhosts-after.txt
md5sum /etc/nginx/sites-available/* | grep -v "preprod.wagesse.fr" > /tmp/wagesse-nginx-after.txt || true
if ! cmp -s /tmp/wagesse-nginx-before.txt /tmp/wagesse-nginx-after.txt; then
  echo "Un fichier nginx d'une autre application a changé. Retrait du vhost WAGESSE." >&2
  diff -u /tmp/wagesse-nginx-before.txt /tmp/wagesse-nginx-after.txt || true
  rollback_nginx
  exit 1
fi
if ! cmp -s /tmp/wagesse-vhosts-before.txt /tmp/wagesse-vhosts-after.txt; then
  echo "Le statut HTTPS d'un autre vhost a changé." >&2
  diff -u /tmp/wagesse-vhosts-before.txt /tmp/wagesse-vhosts-after.txt || true
  rollback_nginx
  exit 1
fi

echo "Préproduction en écoute sur 127.0.0.1:${PORT}, vhost preprod.wagesse.fr uniquement."
echo "Identifiants admin : ${ENV_DIR}/preprod-admin.credentials"
echo "Les ports 3000, 3001, 3010 et 5432 sont toujours ouverts."
