#!/usr/bin/env bash
# Dumps wagesse_preprod, restores that dump into a throwaway database,
# compares row counts, then drops only the throwaway database.
# The dump file is kept.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh restore
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root
step=integrite
verify_script_sums "$DIR"

src=wagesse_preprod
name="wagesse_preprod_restore_$$"
[[ "$name" =~ ^wagesse_preprod_restore_[0-9]+$ ]] || die "Nom de base temporaire refusé."
[[ "$name" != "$src" ]] || die "Refus de réutiliser la base de préproduction."
dump="/var/backups/wagesse-preprod/${src}-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

drop_temp() {
  local target="$1"
  [[ "$target" =~ ^wagesse_preprod_restore_[0-9]+$ ]] || die "Refus de supprimer ${target}."
  [[ "$target" != "$src" ]] || die "Refus de supprimer ${src}."
  mysql -e "DROP DATABASE IF EXISTS \`${target}\`"
}

step=sauvegarde
install -d -m 700 /var/backups/wagesse-preprod
mysqldump --single-transaction --no-tablespaces "$src" | gzip > "$dump"
chown root:root "$dump"
chmod 600 "$dump"
[[ -s "$dump" ]] || die "Dump vide. Aucune base temporaire n'est créée."
echo "Dump conservé : $dump"

step=restauration
mysql -e "CREATE DATABASE \`${name}\`"
cleanup() {
  drop_temp "$name"
}
trap cleanup EXIT
gunzip -c "$dump" | mysql "$name"

step=comparaison
for table in User TransportRequest Quote CommercialOrder CreditWallet Mission AuditLog; do
  if ! left=$(mysql -N -e "SELECT COUNT(*) FROM \`${src}\`.\`${table}\`"); then
    die "Lecture de ${src}.${table} impossible. La base source n'est pas supprimée."
  fi
  if ! right=$(mysql -N -e "SELECT COUNT(*) FROM \`${name}\`.\`${table}\`"); then
    die "Lecture de ${name}.${table} impossible."
  fi
  echo "$table $left $right"
  [[ "$left" == "$right" ]] || die "Écart sur ${table}. La base source n'est pas supprimée."
done

trap - EXIT
step=nettoyage
drop_temp "$name"
if mysql -N -e "SHOW DATABASES LIKE '${name}'" | grep -q .; then
  die "La base temporaire ${name} est encore présente."
fi
mysql -N -e "SHOW DATABASES LIKE '${src}'" | grep -qx "$src" || die "La base ${src} a disparu."
[[ -s "$dump" ]] || die "Le dump a disparu."
echo "Restauration contrôlée. Seule ${name} a été supprimée. Dump conservé : $dump ($(wc -c < "$dump") octets)."
