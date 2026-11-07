# Shared guards for the preproduction recette scripts.
# shellcheck shell=bash

EXPECTED_BASE=36a2ef385d1f58cdd05070f114dcb477e45b88c3

die() {
  echo "$1" >&2
  exit "${2:-1}"
}

require_authorization() {
  [[ "${WAGESSE_PREPROD_AUTHORIZE:-}" == "yes" ]] || die "Autorisation absente. Relancer avec WAGESSE_PREPROD_AUTHORIZE=yes."
}

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "Ce script doit être lancé en root."
}

secret_filter() {
  sed -E \
    -e 's#mysql://[^[:space:]]+#mysql://***#g' \
    -e 's#(password|passphrase|token|secret|authorization)[=:][^[:space:]]+#\1=***#Ig'
}

preprod_database_name() {
  node -e '
    const raw = process.env.DATABASE_URL || ""
    let name = ""
    try { name = new URL(raw).pathname.replace(/^\//, "") } catch { process.exit(2) }
    if (!/^[A-Za-z0-9_]+$/.test(name)) process.exit(2)
    process.stdout.write(name)
  '
}

assert_preprod_database() {
  local name
  name=$(preprod_database_name) || die "Nom de base illisible. Arrêt avant modification."
  [[ "$name" == "wagesse_preprod" ]] || die "Base ${name} refusée. Seule wagesse_preprod est autorisée."
}

verify_script_sums() {
  local dir="$1"
  [[ -f "$dir/SHA256SUMS" ]] || die "SHA256SUMS absent. Arrêt avant exécution."
  (
    cd "$dir"
    sha256sum -c SHA256SUMS --quiet
  ) || die "Somme SHA-256 des scripts refusée. Arrêt avant exécution."
}

# Git refuses a root process on a repository owned by another user.
# Run as that owner instead of widening the set of trusted directories.
git_in() {
  local repo="$1"
  shift
  [[ -d "$repo" ]] || die "Dépôt Git absent : ${repo}."
  local owner home
  owner=$(stat -c '%U' "$repo")
  [[ -n "$owner" && "$owner" != "UNKNOWN" ]] || die "Propriétaire illisible pour ${repo}."
  if [[ "$(id -un)" == "$owner" ]]; then
    GIT_TERMINAL_PROMPT=0 git -C "$repo" "$@"
    return
  fi
  home=$(getent passwd "$owner" | awk -F: '{print $6}')
  [[ -n "$home" ]] || die "Utilisateur ${owner} introuvable pour Git."
  runuser -u "$owner" -- env -i \
    HOME="$home" \
    PATH="/usr/bin:/bin" \
    GIT_TERMINAL_PROMPT=0 \
    git -C "$repo" "$@"
}

assert_descendant() {
  local repo="$1" ref="$2" owner
  owner=$(stat -c '%U' "$repo")
  git_in "$repo" cat-file -e "${EXPECTED_BASE}^{commit}" || die "Commit de référence ${EXPECTED_BASE} introuvable pour ${owner}."
  git_in "$repo" merge-base --is-ancestor "$EXPECTED_BASE" "$ref" || die "Le commit ${ref} ne contient pas ${EXPECTED_BASE} pour ${owner}."
}

assert_bcrypt_declared() {
  local package_json="$1"
  node -e '
    const pkg = require(process.argv[1])
    if (!pkg.dependencies || !pkg.dependencies.bcryptjs) process.exit(1)
  ' "$package_json" || die "bcryptjs absent des dépendances applicatives. Arrêt avant rotation."
}

assert_rotation_layout() {
  local script="$1"
  grep -q 'RUNTIME="${APP}/rotate-recette-accounts.mjs"' "$script" || die "Le script de rotation n'est pas copié dans l'application. Arrêt avant rotation."
  grep -q 'NODE_PATH=' "$script" && die "NODE_PATH ne résout pas un import ESM. Arrêt avant rotation."
  return 0
}

probe_rotation_imports() {
  local app=/opt/wagesse-preprod/app
  local node_bin=/opt/wagesse-preprod/.node/bin/node
  local probe="${app}/.recette-import-probe.mjs"
  if [[ ! -d "$app" ]]; then
    echo "Pas d'installation locale : le contrôle ESM des modules sera exécuté sur le serveur."
    return 0
  fi
  [[ -d "$app/node_modules/bcryptjs" ]] || die "bcryptjs absent de ${app}/node_modules. Arrêt avant toute modification."
  [[ -d "$app/node_modules/@prisma/client" ]] || die "Client Prisma absent de ${app}/node_modules. Arrêt avant toute modification."
  [[ -x "$node_bin" ]] || die "Node de préproduction absent. Arrêt avant toute modification."
  [[ "$(id -u)" -eq 0 ]] || die "Le contrôle des imports sur le serveur doit être lancé en root."
  rm -f "$probe"
  install -m 600 -o wagesse -g wagesse /dev/null "$probe"
  printf '%s\n' 'import bcrypt from "bcryptjs"; import { PrismaClient } from "@prisma/client"; if (typeof bcrypt.hash !== "function" || typeof PrismaClient !== "function") process.exit(1)' > "$probe"
  chown wagesse:wagesse "$probe"
  chmod 600 "$probe"
  if ! runuser -u wagesse -- env -i \
    HOME=/opt/wagesse-preprod \
    PATH=/opt/wagesse-preprod/.node/bin:/usr/bin:/bin \
    "$node_bin" "$probe"; then
    rm -f "$probe"
    die "Les modules ESM ne se résolvent pas depuis l'application. Arrêt avant toute modification."
  fi
  rm -f "$probe"
  echo "Imports ESM résolus depuis l'application, avant toute lecture de la base."
}
