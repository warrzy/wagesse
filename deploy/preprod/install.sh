#!/usr/bin/env bash
# Installation isolée de WAGESSE sur preprod.wagesse.fr.
# Ne modifie pas les vhosts, certificats ou bases des autres applications.
# Usage, sur le VPS, en root :
#   ADMIN_PHONE=70XXXXXX bash deploy/preprod/install.sh
set -euo pipefail

APP_USER=wagesse
APP_DIR=/opt/wagesse-preprod
ENV_DIR=/etc/wagesse
ENV_FILE="${ENV_DIR}/preprod.env"
BACKUP_DIR=/var/backups/wagesse-preprod
NGINX_SITE=/etc/nginx/sites-available/preprod.wagesse.fr
WEBROOT=/var/www/letsencrypt
PORT_DEFAULT=3010
NODE_VERSION=22.23.4
REPO="${DEPLOY_REPO:-https://github.com/warrzy/wagesse.git}"
REF="${DEPLOY_REF:-91e8235de45f3dfd58be558dc4636147d2a7d8df}"
LOG=/var/log/wagesse-preprod-install.log

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
exec > >(tee -a "${LOG}") 2>&1
echo "== WAGESSE préproduction $(date -Is) =="

echo "-- Inventaire avant installation --"
. /etc/os-release
echo "OS ${PRETTY_NAME}"
command -v nginx && nginx -v
command -v node && node -v || echo "node système absent"
command -v mysql && mysql --version || echo "client mysql absent"
command -v mariadbd && mariadbd --version || true
ss -ltnp || netstat -ltnp || true
df -h /
free -h || true

if compgen -G "/etc/nginx/sites-available/*" > /dev/null; then
  tar -czf "${BACKUP_DIR}/nginx-$(date +%Y%m%d%H%M%S).tgz" /etc/nginx/sites-available /etc/nginx/sites-enabled
fi

if [[ -e "${NGINX_SITE}" ]] && grep -q "ecom-touch" "${NGINX_SITE}"; then
  echo "Le fichier ${NGINX_SITE} mentionne ecom-touch. Abandon." >&2
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi
home=$(getent passwd "${APP_USER}" | cut -d: -f6)
if [[ "${home}" != "${APP_DIR}" ]]; then
  echo "L'utilisateur ${APP_USER} existe déjà avec le home ${home}. Abandon." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y curl git
fi
if ! command -v mysql >/dev/null 2>&1; then
  apt-get update
  apt-get install -y mariadb-server
fi
systemctl enable --now mariadb || systemctl enable --now mysql

if systemctl is-active --quiet wagesse-preprod.service; then
  systemctl stop wagesse-preprod.service
fi

PORT="${PORT_DEFAULT}"
while ss -ltn | awk '{print $4}' | grep -q ":${PORT}$"; do
  PORT=$((PORT + 1))
  if [[ "${PORT}" -gt 3020 ]]; then
    echo "Aucun port local libre entre 3010 et 3020." >&2
    exit 1
  fi
done
echo "Port applicatif retenu : 127.0.0.1:${PORT}"

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

mkdir -p "${APP_DIR}"
install_node
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/.node"

if [[ ! -d "${APP_DIR}/app/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO}" "${APP_DIR}/app"
fi
sudo -u "${APP_USER}" git -C "${APP_DIR}/app" fetch --tags origin
sudo -u "${APP_USER}" git -C "${APP_DIR}/app" checkout "${REF}"
echo "Commit déployé : $(git -C "${APP_DIR}/app" rev-parse HEAD)" | tee "${ENV_DIR}/preprod-release.txt"

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
  DATABASE_URL="${DATABASE_URL}" JWT_SECRET="${JWT_SECRET}" \
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" PAYMENT_MODE=MANUAL \
  npm run build
popd >/dev/null

cat > /etc/systemd/system/wagesse-preprod.service <<EOF
[Unit]
Description=WAGESSE préproduction
After=network.target mariadb.service mysql.service
Wants=mariadb.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/app
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/.node/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${PORT}
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now wagesse-preprod.service
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sfn "${NGINX_SITE}" /etc/nginx/sites-enabled/preprod.wagesse.fr
nginx -t
systemctl reload nginx

if [[ ! -f /etc/letsencrypt/live/preprod.wagesse.fr/fullchain.pem ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update
    apt-get install -y certbot
  fi
  certbot_mail=()
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    certbot_mail=(-m "${CERTBOT_EMAIL}")
  else
    certbot_mail=(--register-unsafely-without-email)
  fi
  certbot certonly --webroot -w "${WEBROOT}" -d preprod.wagesse.fr \
    --keep-until-expiring --non-interactive --agree-tos "${certbot_mail[@]}"
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
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name preprod.wagesse.fr;

    ssl_certificate /etc/letsencrypt/live/preprod.wagesse.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preprod.wagesse.fr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

nginx -t
systemctl reload nginx
echo "Préproduction joignable en local sur 127.0.0.1:${PORT}, vhost preprod.wagesse.fr uniquement."
echo "Identifiants admin : ${ENV_DIR}/preprod-admin.credentials"
