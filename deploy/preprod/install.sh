#!/usr/bin/env bash
# Installation isolée de WAGESSE sur preprod.wagesse.fr.
# Root sur le VPS. Ne journalise ni le numéro admin ni les mots de passe.
# Reprise : conserve MariaDB, la base, l'environnement et le Node déjà extrait.
#   bash deploy/preprod/install.sh --check
#   read -rs ADMIN_PHONE; export ADMIN_PHONE; bash deploy/preprod/install.sh; unset ADMIN_PHONE
set -euo pipefail

APP_USER=wagesse
APP_DIR=/opt/wagesse-preprod
ENV_DIR=/etc/wagesse
ENV_FILE="${ENV_DIR}/preprod.env"
BACKUP_DIR=/var/backups/wagesse-preprod
NGINX_SITE=/etc/nginx/sites-available/preprod.wagesse.fr
NGINX_LINK=/etc/nginx/sites-enabled/preprod.wagesse.fr
ACME_WEBROOT=/var/www/html
CERT_NAME=preprod.wagesse.fr
CERT_DIR=/etc/letsencrypt/live/${CERT_NAME}
PORT=3020
NODE_VERSION=22.23.4
# Somme du fichier node-v22.23.4-linux-x64.tar.xz publiée dans
# https://nodejs.org/dist/v22.23.4/SHASUMS256.txt
NODE_SHA256=1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce
REPO="${DEPLOY_REPO:-https://github.com/warrzy/wagesse.git}"
REF="${DEPLOY_REF:-91e8235de45f3dfd58be558dc4636147d2a7d8df}"
LOG=/var/log/wagesse-preprod-install.log
STATE=/tmp/wagesse-preprod-foreign-state.txt
BOOTSTRAP_DIR=""
RUNTIME_ADMIN=""
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Transmis au processus wagesse par sudo, jamais sur la ligne de commande.
APP_SECRET_VARS="NODE_ENV,NEXT_PUBLIC_APP_NAME,NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_CURRENCY,DATABASE_URL,JWT_SECRET,JWT_EXPIRATION,PAYMENT_MODE,PAYDUNYA_ENABLED,PAYDUNYA_MASTER_KEY,PAYDUNYA_PRIVATE_KEY,PAYDUNYA_TOKEN,PAYDUNYA_MODE,PAYMENT_PROVIDER,ORANGE_MONEY_CLIENT_ID,ORANGE_MONEY_CLIENT_SECRET,ORANGE_MONEY_MERCHANT_KEY,SMS_PROVIDER,SMS_HTTP_URL,SMS_HTTP_KEY,SMS_SENDER,SMS_COUNTRY_CODE,SMS_ALLOW_SIMULATE,OTP_DEBUG_RETURN,SEED_DEMO_ACCOUNTS,PORT"

sha256_matches() {
  local file="$1"
  local expected="$2"
  local actual
  actual=$(sha256sum "${file}" | awk '{print $1}')
  [[ "${actual}" == "${expected}" ]]
}

secret_filter() {
  sed -u -E \
    -e 's#mysql://[^[:space:]'\''"]+#mysql://[redacted]#g' \
    -e 's#(JWT_SECRET=)[^[:space:]]+#\1[redacted]#g' \
    -e 's#(PAYDUNYA_[A-Z_]*(KEY|TOKEN)=)[^[:space:]]+#\1[redacted]#g' \
    -e 's#(ORANGE_MONEY_[A-Z_]*(SECRET|KEY)=)[^[:space:]]+#\1[redacted]#g' \
    -e 's#(SMS_HTTP_KEY=)[^[:space:]]+#\1[redacted]#g' \
    -e 's#(password=)[^[:space:]]+#\1[redacted]#g' \
    -e 's#(phone=)[0-9]+#\1[redacted]#g'
}

self_check() {
  local work hash line
  if [[ "${NODE_SHA256}" != "1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce" ]]; then
    echo "Somme Node.js inattendue." >&2
    return 1
  fi
  work=$(mktemp -d)
  printf 'not-node' > "${work}/fake.tar.xz"
  if sha256_matches "${work}/fake.tar.xz" "${NODE_SHA256}"; then
    echo "Une archive incorrecte a été acceptée." >&2
    rm -rf "${work}"
    return 1
  fi
  if compgen -G "${work}/node-v${NODE_VERSION}-*" > /dev/null; then
    echo "L'archive incorrecte a été extraite." >&2
    rm -rf "${work}"
    return 1
  fi
  printf 'ok' > "${work}/ok"
  hash=$(sha256sum "${work}/ok" | awk '{print $1}')
  if ! sha256_matches "${work}/ok" "${hash}"; then
    echo "Une archive correcte a été refusée." >&2
    rm -rf "${work}"
    return 1
  fi
  rm -rf "${work}"

  if grep -vE '^[[:space:]]*#' "$0" | grep -Eq 'safe\.directory|git[[:space:]]+config|migrate[[:space:]]+reset|DROP[[:space:]]+DATABASE|apt-get[[:space:]]+(upgrade|dist-upgrade|remove|purge)'; then
    echo "Commande interdite présente dans le script." >&2
    return 1
  fi
  if grep -vE '^[[:space:]]*#' "$0" | grep -E 'systemctl[[:space:]]+(stop|restart|disable|kill)' | grep -vq 'wagesse-preprod'; then
    echo "Le script agit sur un service autre que wagesse-preprod." >&2
    return 1
  fi
  local prev="" trimmed context
  while IFS= read -r line; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    if [[ "${trimmed}" == git\ * ]]; then
      context="${prev} ${line}"
      if [[ "${context}" != *'sudo -u "${APP_USER}"'* ]]; then
        echo "Commande Git hors du propriétaire de l'application : ${line}" >&2
        return 1
      fi
    fi
    prev="${line}"
  done < "$0"
  if grep -q 'process\.env\.ADMIN_PHONE' "$0"; then
    echo "Le numéro administrateur est passé au processus par la ligne de commande." >&2
    return 1
  fi
  if grep -E 'console\.(log|error|info)' "${0%/*}/create-admin.mjs" | grep -Eq 'phone|password|ADMIN_PHONE'; then
    echo "Le script admin journalise un identifiant." >&2
    return 1
  fi
  if ! grep -q 'process.getuid' "${0%/*}/create-admin.mjs"; then
    echo "Le script admin ne refuse pas root." >&2
    return 1
  fi
  local filtered continued
  filtered=$(printf '%s\n' 'mysql://wagesse_preprod:supersecret@127.0.0.1:3306/db' | secret_filter)
  if [[ "${filtered}" == *supersecret* || "${filtered}" != *'mysql://[redacted]'* ]]; then
    echo "Le filtre ne masque pas une URL de base." >&2
    return 1
  fi
  continued=$(bash -c 'set -euo pipefail; . /no/such/wagesse.env; echo CONTINUED' 2>/dev/null || true)
  if [[ "${continued}" == *CONTINUED* ]]; then
    echo "Un chargement de secrets raté ne s'arrête pas." >&2
    return 1
  fi
  local bad_source bad_mode
  bad_source="bash \"\${ENV_FILE}\""
  bad_mode="chmod 64""0"
  if grep -F -q "${bad_source}" "$0" || grep -F -q "${bad_mode} \"\${ENV_FILE}\"" "$0"; then
    echo "Le compte applicatif lirait encore le fichier de secrets." >&2
    return 1
  fi
  if ! grep -q 'chmod 600 "${ENV_FILE}"' "$0" || ! grep -q 'exec_as_app "${APP_SECRET_VARS}"' "$0"; then
    echo "Les secrets ne restent pas limités à root." >&2
    return 1
  fi
  if ! grep -q -- '--preserve-env="${preserve}"' "$0"; then
    echo "Les variables ne sont pas transmises par l'environnement du processus." >&2
    return 1
  fi
  if ! grep -q 'DATABASE_URL absent' "$0"; then
    echo "L'absence de DATABASE_URL n'interrompt pas Prisma." >&2
    return 1
  fi
  if ! grep -q 'ACME_WEBROOT=/var/www/html' "$0" || ! grep -q 'alias ${ACME_WEBROOT}/.well-known/acme-challenge/' "$0"; then
    echo "Le défi ACME n'utilise pas la racine déjà publiée par nginx." >&2
    return 1
  fi
  if ! grep -q 'http://${CERT_NAME}/.well-known/acme-challenge/' "$0"; then
    echo "Le défi ACME public n'est pas vérifié." >&2
    return 1
  fi
  echo "Vérification statique du script réussie."
}

if [[ "${1:-}" == "--check" ]]; then
  self_check
  exit $?
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ce script doit être lancé en root." >&2
  exit 1
fi

if [[ -z "${ADMIN_PHONE:-}" || ! "${ADMIN_PHONE}" =~ ^[0-9]{8,15}$ ]]; then
  echo "Numéro administrateur requis : 8 à 15 chiffres." >&2
  exit 1
fi

cleanup_runtime() {
  local status=$?
  if [[ -n "${BOOTSTRAP_DIR}" && -d "${BOOTSTRAP_DIR}" ]]; then
    if command -v shred >/dev/null 2>&1; then
      find "${BOOTSTRAP_DIR}" -type f -exec shred -u {} + 2>/dev/null || true
    fi
    rm -rf "${BOOTSTRAP_DIR}"
  fi
  if [[ -n "${RUNTIME_ADMIN}" && -f "${RUNTIME_ADMIN}" ]]; then
    rm -f "${RUNTIME_ADMIN}"
  fi
  unset ADMIN_PHONE DATABASE_URL JWT_SECRET db_pass jwt \
    PAYDUNYA_MASTER_KEY PAYDUNYA_PRIVATE_KEY PAYDUNYA_TOKEN \
    ORANGE_MONEY_CLIENT_ID ORANGE_MONEY_CLIENT_SECRET ORANGE_MONEY_MERCHANT_KEY \
    SMS_HTTP_KEY SMS_HTTP_URL || true
  exit "${status}"
}
trap cleanup_runtime EXIT

umask 022
mkdir -p "${BACKUP_DIR}" "${ENV_DIR}"
chmod 700 "${ENV_DIR}" "${BACKUP_DIR}"
mkdir -p "${ACME_WEBROOT}/.well-known/acme-challenge"
chmod 755 "${ACME_WEBROOT}/.well-known" "${ACME_WEBROOT}/.well-known/acme-challenge"
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
      md5sum /etc/nginx/sites-available/* | grep -v "${CERT_NAME}" || true
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
    if [[ -L "${NGINX_LINK}" || -f "${NGINX_SITE}" ]]; then
      rollback_nginx
    fi
    exit 1
  fi
}

assert_mariadb_local() {
  local exposed
  if ! port_open 3306; then
    echo "MariaDB n'écoute pas. Arrêt sans modifier les autres services." >&2
    exit 1
  fi
  exposed=$(ss -ltn | awk '{print $4}' | grep -E ':3306$' | grep -Ev '^(127\.0\.0\.1:3306|\[::1\]:3306)$' || true)
  if [[ -n "${exposed}" ]]; then
    echo "MariaDB est exposé hors de localhost. Arrêt sans changer sa configuration." >&2
    exit 1
  fi
}

rollback_nginx() {
  rm -f "${NGINX_LINK}"
  if [[ -f "${NGINX_SITE}" ]] && ! grep -Eq "ecom-touch|ecomschool|wendyam|tme-machinery" "${NGINX_SITE}"; then
    rm -f "${NGINX_SITE}"
  fi
  if nginx -t; then
    systemctl reload nginx
  fi
  systemctl disable --now wagesse-preprod.service || true
  echo "Vhost WAGESSE retiré. MariaDB, PostgreSQL et les autres vhosts sont conservés." >&2
}

git_app() {
  sudo -u "${APP_USER}" env HOME="${APP_DIR}" GIT_TERMINAL_PROMPT=0 \
    git -C "${APP_DIR}/app" "$@"
}

run_as_app_clean() {
  sudo -u "${APP_USER}" env HOME="${APP_DIR}" PATH="${APP_DIR}/.node/bin:${PATH}" \
    bash -c 'set -euo pipefail; cd "$1" || exit 1; shift; exec "$@"' \
    bash "${APP_DIR}/app" "$@"
}

exec_as_app() {
  local preserve="$1"
  shift
  local status
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL absent. Arrêt avant Prisma ou le build." >&2
    exit 1
  fi
  set +e
  sudo --preserve-env="${preserve}" -u "${APP_USER}" \
    env HOME="${APP_DIR}" PATH="${APP_DIR}/.node/bin:${PATH}" \
    "$@" 2>&1 | secret_filter
  status=${PIPESTATUS[0]}
  set -e
  if [[ "${status}" -ne 0 ]]; then
    echo "Commande applicative interrompue (code ${status})." >&2
    exit "${status}"
  fi
}

run_as_app() {
  local arg
  for arg in "$@"; do
    if [[ "${arg}" == "reset" ]]; then
      echo "Migration destructive refusée." >&2
      exit 1
    fi
  done
  exec_as_app "${APP_SECRET_VARS}" \
    bash -c 'set -euo pipefail; if [[ -z "${DATABASE_URL:-}" ]]; then echo "DATABASE_URL absent. Arrêt avant Prisma ou le build." >&2; exit 1; fi; cd "$1" || exit 1; shift; exec "$@"' \
    bash "${APP_DIR}/app" "$@"
}

mysql_hidden() {
  local err
  err=$(mktemp "${ENV_DIR}/mysql-error.XXXXXX")
  chmod 600 "${err}"
  if ! mysql --batch >"${err}" 2>&1; then
    shred -u "${err}" 2>/dev/null || rm -f "${err}"
    echo "Commande MariaDB refusée. Le détail n'est pas journalisé." >&2
    return 1
  fi
  shred -u "${err}" 2>/dev/null || rm -f "${err}"
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
echo "Les applications des ports 3000, 3001, 3010 et PostgreSQL 5432 ne sont ni sauvegardées ni redémarrées."

if [[ -e "${NGINX_SITE}" ]] && grep -Eq "ecom-touch|ecomschool|wendyam|tme-machinery" "${NGINX_SITE}"; then
  echo "Le fichier ${NGINX_SITE} mentionne une autre application. Abandon." >&2
  exit 1
fi

for port in 22 80 443 3000 3001 3010 5432; do
  if ! port_open "${port}"; then
    echo "Port attendu ${port} absent avant installation. Abandon sans changement applicatif." >&2
    exit 1
  fi
done

snapshot_foreign
tar -czf "${BACKUP_DIR}/nginx-$(date +%Y%m%d%H%M%S).tgz" /etc/nginx/sites-available /etc/nginx/sites-enabled
md5sum /etc/nginx/sites-available/* | grep -v "${CERT_NAME}" > /tmp/wagesse-nginx-before.txt || true
if [[ -d /etc/letsencrypt/live ]]; then
  find /etc/letsencrypt/live -mindepth 1 -maxdepth 1 \( -type d -o -type l \) -printf '%f\n' | sort > /tmp/wagesse-certs-before.txt
else
  : > /tmp/wagesse-certs-before.txt
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  mkdir -p "${APP_DIR}"
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin --no-create-home "${APP_USER}"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}"
fi
home=$(getent passwd "${APP_USER}" | cut -d: -f6)
if [[ "${home}" != "${APP_DIR}" ]]; then
  echo "L'utilisateur ${APP_USER} existe déjà avec un autre répertoire. Abandon." >&2
  exit 1
fi
if [[ ! -d "${APP_DIR}" ]]; then
  mkdir -p "${APP_DIR}"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}"
fi
chmod 700 "${APP_DIR}"

export DEBIAN_FRONTEND=noninteractive
if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-upgrade curl ca-certificates git
fi
if ! command -v mysql >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-upgrade mariadb-server
fi
if systemctl is-active --quiet mariadb; then
  systemctl enable mariadb
else
  systemctl enable --now mariadb
fi
assert_foreign_still_up
assert_mariadb_local

if systemctl is-active --quiet wagesse-preprod.service; then
  systemctl stop wagesse-preprod.service
fi
if port_open "${PORT}"; then
  echo "Le port ${PORT} est occupé par un autre processus. Abandon." >&2
  ss -ltn | grep ":${PORT}" || true
  exit 1
fi

install_node() {
  local dest="${APP_DIR}/.node"
  local work tarball
  if [[ -x "${dest}/bin/node" ]]; then
    local current
    current=$("${dest}/bin/node" -v)
    if [[ "${current}" != "v${NODE_VERSION}" ]]; then
      echo "Node isolé ${current} différent de v${NODE_VERSION}. Abandon sans remplacement." >&2
      exit 1
    fi
    return
  fi
  work=$(mktemp -d)
  tarball="${work}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  curl -fsSL --retry 3 "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o "${tarball}"
  if ! sha256_matches "${tarball}" "${NODE_SHA256}"; then
    rm -rf "${work}"
    echo "Somme SHA-256 de l'archive Node.js invalide. Installation interrompue avant extraction." >&2
    exit 1
  fi
  tar -xJf "${tarball}" -C "${work}"
  rm -rf "${dest}"
  mv "${work}/node-v${NODE_VERSION}-linux-x64" "${dest}"
  rm -rf "${work}"
}

install_node
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/.node"

if [[ ! -d "${APP_DIR}/app/.git" ]]; then
  sudo -u "${APP_USER}" env HOME="${APP_DIR}" GIT_TERMINAL_PROMPT=0 \
    git clone "${REPO}" "${APP_DIR}/app"
fi
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/app"
git_app fetch origin
git_app checkout --detach "${REF}"
deployed=$(git_app rev-parse HEAD)
printf '%s\n' "Commit déployé : ${deployed}" | tee "${ENV_DIR}/preprod-release.txt"
chmod 644 "${ENV_DIR}/preprod-release.txt"
if [[ "${deployed}" != "${REF}" ]]; then
  echo "Le commit déployé ne correspond pas au commit attendu." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  db_pass=$(openssl rand -base64 24 | tr -d '/+=\n' | head -c 32)
  jwt=$(openssl rand -base64 48 | tr -d '\n')
  if mysql -N -e "SHOW DATABASES LIKE 'wagesse_preprod'" | grep -qx wagesse_preprod; then
    mysqldump --single-transaction --skip-comments wagesse_preprod | gzip > "${BACKUP_DIR}/wagesse_preprod-$(date +%Y%m%d%H%M%S).sql.gz"
    chmod 600 "${BACKUP_DIR}"/wagesse_preprod-*.sql.gz
  fi
  mysql_hidden <<SQL
CREATE DATABASE IF NOT EXISTS wagesse_preprod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wagesse_preprod'@'localhost' IDENTIFIED BY '${db_pass}';
ALTER USER 'wagesse_preprod'@'localhost' IDENTIFIED BY '${db_pass}';
GRANT ALL PRIVILEGES ON wagesse_preprod.* TO 'wagesse_preprod'@'localhost';
FLUSH PRIVILEGES;
SQL
  umask 077
  cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Wagesse
NEXT_PUBLIC_APP_URL=https://${CERT_NAME}
NEXT_PUBLIC_CURRENCY=XOF
DATABASE_URL="mysql://wagesse_preprod:${db_pass}@127.0.0.1:3306/wagesse_preprod"
JWT_SECRET="${jwt}"
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
  umask 022
else
  echo "Fichier d'environnement conservé."
  if mysql -N -e "SHOW DATABASES LIKE 'wagesse_preprod'" | grep -qx wagesse_preprod; then
    mysqldump --single-transaction --skip-comments wagesse_preprod | gzip > "${BACKUP_DIR}/wagesse_preprod-$(date +%Y%m%d%H%M%S).sql.gz"
    chmod 600 "${BACKUP_DIR}"/wagesse_preprod-*.sql.gz
  fi
fi

chown root:root "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
chmod 700 "${ENV_DIR}"
if [[ ! -r "${ENV_FILE}" ]]; then
  echo "Fichier d'environnement illisible pour root. Arrêt." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL absent. Migrations interrompues." >&2
  exit 1
fi

if [[ "${PORT}" != "3020" || "${PAYMENT_MODE}" != "MANUAL" || "${PAYDUNYA_ENABLED}" != "false" || "${SEED_DEMO_ACCOUNTS}" != "false" ]]; then
  echo "L'environnement ne respecte pas le mode manuel, PayDunya inactif, le port 3020 ou l'absence de comptes de démonstration." >&2
  exit 1
fi
if [[ "${PAYMENT_PROVIDER}" == "orange_money_sandbox" || -n "${SMS_ALLOW_SIMULATE:-}" || -n "${OTP_DEBUG_RETURN:-}" ]]; then
  echo "Le bac à sable Orange Money ou la simulation SMS est actif. Abandon." >&2
  exit 1
fi

pushd "${APP_DIR}/app" >/dev/null
run_as_app_clean npm ci
run_as_app npx prisma generate
run_as_app npx prisma migrate deploy
run_as_app env SEED_DEMO_ACCOUNTS=false npm run seed

BOOTSTRAP_DIR="${APP_DIR}/.bootstrap"
rm -rf "${BOOTSTRAP_DIR}"
install -d -m 700 -o "${APP_USER}" -g "${APP_USER}" "${BOOTSTRAP_DIR}"
install -m 600 -o "${APP_USER}" -g "${APP_USER}" /dev/null "${BOOTSTRAP_DIR}/admin.env"
printf 'ADMIN_PHONE=%s\nADMIN_CREDENTIALS_PATH=%s\n' "${ADMIN_PHONE}" "${BOOTSTRAP_DIR}/credentials" > "${BOOTSTRAP_DIR}/admin.env"
chown "${APP_USER}:${APP_USER}" "${BOOTSTRAP_DIR}/admin.env"
chmod 600 "${BOOTSTRAP_DIR}/admin.env"
RUNTIME_ADMIN="${APP_DIR}/app/create-admin.runtime.mjs"
install -m 600 -o "${APP_USER}" -g "${APP_USER}" "${SCRIPT_DIR}/create-admin.mjs" "${RUNTIME_ADMIN}"
exec_as_app "DATABASE_URL" \
  bash -c 'set -euo pipefail; set -a; . "$1"; set +a; if [[ -z "${DATABASE_URL:-}" || -z "${ADMIN_PHONE:-}" ]]; then echo "Secrets administrateur incomplets. Arrêt." >&2; exit 1; fi; cd "$2" || exit 1; exec node "$3"' \
  bash "${BOOTSTRAP_DIR}/admin.env" "${APP_DIR}/app" "${RUNTIME_ADMIN}"
if [[ -f "${BOOTSTRAP_DIR}/credentials" ]]; then
  install -m 600 -o root -g root "${BOOTSTRAP_DIR}/credentials" "${ENV_DIR}/preprod-admin.credentials"
fi
if [[ -f "${ENV_DIR}/preprod-admin.credentials" ]]; then
  chown root:root "${ENV_DIR}/preprod-admin.credentials"
  chmod 600 "${ENV_DIR}/preprod-admin.credentials"
fi
if command -v shred >/dev/null 2>&1; then
  find "${BOOTSTRAP_DIR}" -type f -exec shred -u {} + 2>/dev/null || true
fi
rm -rf "${BOOTSTRAP_DIR}"
BOOTSTRAP_DIR=""
rm -f "${RUNTIME_ADMIN}"
RUNTIME_ADMIN=""

run_as_app env NODE_OPTIONS="--max-old-space-size=2048" npm run build
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
Environment=HOSTNAME=127.0.0.1
ExecStart=${APP_DIR}/.node/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3020
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

show_service_log() {
  systemctl show wagesse-preprod.service -p ActiveState -p Result -p ExecMainStatus -p ExecMainCode --no-pager || true
  journalctl -u wagesse-preprod.service -n 80 --no-pager -o cat 2>/dev/null | secret_filter || true
}

systemctl daemon-reload
chmod 644 /etc/systemd/system/wagesse-preprod.service
systemctl reset-failed wagesse-preprod.service || true
systemctl enable --now wagesse-preprod.service
ready=0
for _ in $(seq 1 30); do
  if curl -fs -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/"; then
    ready=1
    break
  fi
  if ! systemctl is-active --quiet wagesse-preprod.service; then
    echo "Le service WAGESSE s'est arrêté pendant le démarrage." >&2
    show_service_log >&2
    systemctl disable --now wagesse-preprod.service || true
    exit 1
  fi
  sleep 2
done
if [[ "${ready}" -ne 1 ]]; then
  echo "WAGESSE ne répond pas sur 127.0.0.1:${PORT} après une minute." >&2
  show_service_log >&2
  systemctl disable --now wagesse-preprod.service || true
  exit 1
fi
mapfile -t wage_listeners < <(ss -ltn | awk '{print $4}' | grep -E ':3020$' || true)
if [[ "${#wage_listeners[@]}" -ne 1 || "${wage_listeners[0]}" != "127.0.0.1:3020" ]]; then
  echo "WAGESSE n'est pas limité à 127.0.0.1:3020. Arrêt du service WAGESSE." >&2
  systemctl disable --now wagesse-preprod.service || true
  exit 1
fi
assert_foreign_still_up
assert_mariadb_local

collect_vhost_status() {
  local out="$1"
  : > "${out}"
  local name
  while read -r name; do
    [[ -z "${name}" || "${name}" == "_" || "${name}" == "${CERT_NAME}" ]] && continue
    local code
    code=$(curl -sk --resolve "${name}:443:127.0.0.1" --max-time 15 -o /dev/null -w "%{http_code}" "https://${name}/" || echo "000")
    echo "${name} ${code}" >> "${out}"
  done < <(grep -hE '^\s*server_name\s+' /etc/nginx/sites-enabled/* | sed -E 's/.*server_name\s+//; s/;//' | tr ' ' '\n' | sort -u)
}

collect_vhost_status /tmp/wagesse-vhosts-before.txt

write_http_vhost() {
  cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${CERT_NAME};

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        alias ${ACME_WEBROOT}/.well-known/acme-challenge/;
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
}

write_https_vhost() {
  cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${CERT_NAME};

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        alias ${ACME_WEBROOT}/.well-known/acme-challenge/;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${CERT_NAME};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
}

enable_site() {
  chmod 644 "${NGINX_SITE}"
  ln -sfn "${NGINX_SITE}" "${NGINX_LINK}"
  if ! nginx -t; then
    rollback_nginx
    exit 1
  fi
  systemctl reload nginx
}

probe_acme() {
  local probe probe_file local_code public_code local_body public_body
  probe=$(openssl rand -hex 16)
  probe_file="${ACME_WEBROOT}/.well-known/acme-challenge/${probe}"
  printf '%s' 'wagesse-probe' > "${probe_file}"
  chmod 644 "${probe_file}"
  local_body=$(mktemp)
  public_body=$(mktemp)
  local_code=$(curl -s -o "${local_body}" -w "%{http_code}" --max-time 10 \
    --resolve "${CERT_NAME}:80:127.0.0.1" \
    "http://${CERT_NAME}/.well-known/acme-challenge/${probe}" || true)
  public_code=$(curl -s -o "${public_body}" -w "%{http_code}" --max-time 20 \
    "http://${CERT_NAME}/.well-known/acme-challenge/${probe}" || true)
  local_code=${local_code:-000}
  public_code=${public_code:-000}
  if [[ "${local_code}" == "200" && "$(cat "${local_body}")" == "wagesse-probe" \
    && "${public_code}" == "200" && "$(cat "${public_body}")" == "wagesse-probe" ]]; then
    rm -f "${probe_file}" "${local_body}" "${public_body}"
    echo "Défi ACME servi en local et en public pour ${CERT_NAME}."
    return 0
  fi
  echo "Le défi ACME n'est pas servi pour ${CERT_NAME} (local ${local_code}, public ${public_code})." >&2
  rm -f "${probe_file}" "${local_body}" "${public_body}"
  return 1
}

if [[ ! -f "${CERT_DIR}/fullchain.pem" ]]; then
  write_http_vhost
  enable_site
  assert_foreign_still_up
  if ! probe_acme; then
    rollback_nginx
    exit 1
  fi
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update
    apt-get install -y --no-upgrade --no-install-recommends certbot
  fi
  certbot_args=(
    certonly --webroot -w "${ACME_WEBROOT}" --cert-name "${CERT_NAME}" -d "${CERT_NAME}"
    --keep-until-expiring --non-interactive
    --deploy-hook "systemctl reload nginx"
  )
  if [[ -d /etc/letsencrypt/accounts ]]; then
    :
  elif [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    certbot_args+=(--agree-tos --no-eff-email -m "${CERTBOT_EMAIL}")
  else
    certbot_args+=(--agree-tos --register-unsafely-without-email)
  fi
  if ! certbot "${certbot_args[@]}"; then
    echo "Certificat non obtenu pour ${CERT_NAME}. Les autres certificats ne sont pas modifiés." >&2
    rollback_nginx
    exit 1
  fi
fi

install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/wagesse-preprod-reload.sh <<EOF
#!/bin/sh
if [ "\$RENEWED_LINEAGE" = "/etc/letsencrypt/live/${CERT_NAME}" ]; then
  systemctl reload nginx
fi
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/wagesse-preprod-reload.sh

write_https_vhost
if grep -q 'http2' "${NGINX_SITE}" || grep -E 'server_name' "${NGINX_SITE}" | grep -Evq "${CERT_NAME}"; then
  echo "Le vhost WAGESSE viserait un autre nom ou activerait http2." >&2
  rollback_nginx
  exit 1
fi
enable_site
assert_foreign_still_up

cert_text=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "${CERT_NAME}" 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || true)
if ! grep -Fq "${CERT_NAME}" <<<"${cert_text}"; then
  echo "Le certificat présenté ne couvre pas ${CERT_NAME}." >&2
  rollback_nginx
  exit 1
fi
if ! curl -fsS --max-time 20 --resolve "${CERT_NAME}:443:127.0.0.1" -o /dev/null "https://${CERT_NAME}/"; then
  echo "HTTPS local ne répond pas pour ${CERT_NAME}." >&2
  rollback_nginx
  exit 1
fi
echo "HTTPS_READY"

if [[ -d /etc/letsencrypt/live ]]; then
  find /etc/letsencrypt/live -mindepth 1 -maxdepth 1 \( -type d -o -type l \) -printf '%f\n' | sort > /tmp/wagesse-certs-after.txt
else
  : > /tmp/wagesse-certs-after.txt
fi
if comm -23 /tmp/wagesse-certs-before.txt /tmp/wagesse-certs-after.txt | grep -q .; then
  echo "Un certificat déjà présent a disparu. Retrait du vhost WAGESSE." >&2
  rollback_nginx
  exit 1
fi
while read -r added; do
  [[ -z "${added}" || "${added}" == "${CERT_NAME}" || "${added}" == "README" ]] && continue
  echo "Un certificat autre que ${CERT_NAME} a été ajouté." >&2
  rollback_nginx
  exit 1
done < <(comm -13 /tmp/wagesse-certs-before.txt /tmp/wagesse-certs-after.txt)

collect_vhost_status /tmp/wagesse-vhosts-after.txt
md5sum /etc/nginx/sites-available/* | grep -v "${CERT_NAME}" > /tmp/wagesse-nginx-after.txt || true
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

if ! certbot renew --cert-name "${CERT_NAME}" --dry-run --non-interactive; then
  echo "RENEWAL_DRY_RUN_FAILED"
  echo "Le vhost, le service et la base sont conservés. Le renouvellement simulé n'a pas abouti." >&2
  exit 2
fi

assert_foreign_still_up
assert_mariadb_local
systemctl is-active --quiet wagesse-preprod.service
echo "RENEWAL_DRY_RUN_OK"
echo "Préproduction en écoute sur 127.0.0.1:${PORT}, vhost ${CERT_NAME} uniquement."
echo "Paiement manuel, PayDunya désactivé, simulation SMS absente."
echo "Identifiants admin : ${ENV_DIR}/preprod-admin.credentials"
echo "Les ports 3000, 3001, 3010 et 5432 sont toujours ouverts."
