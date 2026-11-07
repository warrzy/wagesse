#!/usr/bin/env bash
# Dumps wagesse_preprod, restores it into a throwaway database, compares
# row counts, then drops only that throwaway database.
#
# Do not run until the owner has authorized this privileged operation:
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/restore-check.sh
set -euo pipefail

if [[ "${WAGESSE_PREPROD_AUTHORIZE:-}" != "yes" ]]; then
  echo "Autorisation absente. Relancer avec WAGESSE_PREPROD_AUTHORIZE=yes." >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ce script doit être lancé en root." >&2
  exit 1
fi

src=wagesse_preprod
name="wagesse_preprod_restore_$$"
[[ "$name" == wagesse_preprod_restore_* ]]
dump="/var/backups/wagesse-preprod/${src}-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

install -d -m 700 /var/backups/wagesse-preprod
mysqldump --single-transaction --no-tablespaces "$src" | gzip > "$dump"
chown root:root "$dump"
chmod 600 "$dump"

mysql -e "CREATE DATABASE \`$name\`"
cleanup() {
  mysql -e "DROP DATABASE IF EXISTS \`$name\`"
}
trap cleanup EXIT

gunzip -c "$dump" | mysql "$name"

for table in User TransportRequest Quote CommercialOrder CreditWallet Mission AuditLog; do
  left=$(mysql -N -e "SELECT COUNT(*) FROM \`$src\`.\`$table\`")
  right=$(mysql -N -e "SELECT COUNT(*) FROM \`$name\`.\`$table\`")
  echo "$table $left $right"
  [[ "$left" == "$right" ]]
done

echo "Restauration contrôlée sur $name, puis base jetable supprimée. $src n'a pas été modifiée."
