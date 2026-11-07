#!/usr/bin/env bash
# Checks the script checksums and, when a commit is given, that this commit
# contains the reviewed base and the same script bytes.
#   bash deploy/preprod/preflight.sh
#   bash deploy/preprod/preflight.sh <commit>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
verify_script_sums "$DIR"

repo=$(git_in "$DIR" rev-parse --show-toplevel)
assert_bcrypt_declared "$repo/package.json"
assert_rotation_layout "$DIR/rotate-recette-secrets.sh"
probe_rotation_imports
git_in "$repo" cat-file -e "${EXPECTED_BASE}^{commit}" || die "Commit de référence ${EXPECTED_BASE} introuvable."
echo "Commit de référence présent : ${EXPECTED_BASE}"

ref="${1:-}"
if [[ -z "$ref" ]]; then
  echo "Sommes locales acceptées. Relancer avec le commit à déployer pour les comparer au dépôt."
  exit 0
fi
[[ "$ref" =~ ^[0-9a-f]{40}$ ]] || die "Commit complet requis."
git_in "$repo" cat-file -e "${ref}^{commit}" || die "Commit ${ref} introuvable dans ce dépôt."
assert_descendant "$repo" "$ref"
while read -r sum file; do
  git_sum=$(git_in "$repo" show "$ref:deploy/preprod/$file" | sha256sum | awk '{print $1}')
  [[ "$git_sum" == "$sum" ]] || die "Le commit ${ref} ne contient pas le script contrôlé : ${file}."
done < "$DIR/SHA256SUMS"
echo "Intégrité acceptée pour ${ref}."
