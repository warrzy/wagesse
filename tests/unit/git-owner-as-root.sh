#!/usr/bin/env bash
# Runs as root. A repository owned by wagesse must reject root and accept git_in.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ce test doit tourner en root." >&2
  exit 1
fi

root="$1"
# shellcheck disable=SC1091
source "$root/deploy/preprod/lib.sh"

created=0
tmpdir=$(mktemp -d)
chmod 755 "$tmpdir"
cleanup() {
  if [[ "$created" == 1 ]]; then
    userdel wagesse >/dev/null 2>&1 || true
  fi
  rm -rf "$tmpdir"
}
trap cleanup EXIT

if ! id wagesse >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$tmpdir/home" wagesse
  created=1
fi

repo="$tmpdir/app"
mkdir -p "$repo"
chown wagesse:wagesse "$repo"
runuser -u wagesse -- git -C "$repo" init -b main
runuser -u wagesse -- git -C "$repo" -c user.email=recette@example.com -c user.name=recette commit --allow-empty -m init
expected=$(runuser -u wagesse -- git -C "$repo" rev-parse HEAD)

set +e
git -C "$repo" rev-parse HEAD >"$tmpdir/out" 2>"$tmpdir/err"
code=$?
set -e
[[ "$code" != 0 ]]
grep -q "dubious ownership" "$tmpdir/err"

actual=$(git_in "$repo" rev-parse HEAD)
[[ "$actual" == "$expected" ]]

if git_in "$repo" config --global --get-regexp 'safe\.directory' >/dev/null 2>&1; then
  echo "git_in a trouvé safe.directory dans la configuration de wagesse." >&2
  exit 1
fi

echo "root refusé, wagesse accepté, commit ${actual}"
