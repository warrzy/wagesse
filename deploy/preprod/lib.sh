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

assert_descendant() {
  local repo="$1" ref="$2"
  git -C "$repo" cat-file -e "${EXPECTED_BASE}^{commit}" || die "Commit de référence ${EXPECTED_BASE} introuvable."
  git -C "$repo" merge-base --is-ancestor "$EXPECTED_BASE" "$ref" || die "Le commit ${ref} ne contient pas ${EXPECTED_BASE}."
}
