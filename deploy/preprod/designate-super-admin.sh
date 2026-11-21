#!/usr/bin/env bash
# Promotes one existing active ADMIN to SUPER_ADMIN on wagesse_preprod.
# Every other account stays unchanged. A no-op is not committed as a success.
#
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh super-admin <telephone>
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck disable=SC1091
source "$DIR/lib.sh"
require_authorization
require_root

phone="${1:-}"
[[ "$phone" =~ ^[0-9]{8,15}$ ]] || die "Téléphone refusé. Aucun rôle n'est modifié."

ENV_FILE=/etc/wagesse/preprod.env
[[ -f "$ENV_FILE" ]] || die "Environnement de préproduction absent. Aucun rôle n'est modifié."
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
assert_preprod_database
unset DATABASE_URL

db=wagesse_preprod
mysql_n() {
  mysql --batch --raw --skip-column-names "$db" "$@"
}

supers=$(mysql_n -e "SELECT COUNT(*) FROM User WHERE role = 'SUPER_ADMIN'")
[[ "$supers" == "0" ]] || die "Un super administrateur existe déjà (${supers}). Aucun rôle n'est modifié."
match=$(mysql_n -e "SELECT COUNT(*) FROM User WHERE phone = '${phone}' AND role = 'ADMIN' AND status = 'ACTIVE' AND deletedAt IS NULL")
[[ "$match" == "1" ]] || die "Le téléphone ${phone} ne désigne pas un seul administrateur actif. Aucun rôle n'est modifié."
admins_before=$(mysql_n -e "SELECT COUNT(*) FROM User WHERE role = 'ADMIN'")
others_before=$(mysql_n -e "SELECT phone FROM User WHERE role = 'ADMIN' AND phone <> '${phone}' ORDER BY phone")

result=$(mysql_n <<SQL
SET autocommit=0;
START TRANSACTION;
SELECT id INTO @target FROM User
  WHERE phone = '${phone}' AND role = 'ADMIN' AND status = 'ACTIVE' AND deletedAt IS NULL
  LIMIT 1;
UPDATE User
  SET role = 'SUPER_ADMIN'
  WHERE id = @target
    AND role = 'ADMIN'
    AND (SELECT counted FROM (SELECT COUNT(*) AS counted FROM User WHERE role = 'SUPER_ADMIN') existing) = 0;
SELECT ROW_COUNT() INTO @changed;
INSERT INTO AuditLog (id, userId, action, resource, resourceId, changes, createdAt)
SELECT CONCAT('super-', @target), @target, 'designate_super_admin', 'User', @target,
       JSON_OBJECT('from', 'ADMIN', 'to', 'SUPER_ADMIN'), NOW(3)
  FROM User
  WHERE id = @target AND @changed = 1;
SELECT @changed;
COMMIT;
SQL
)
changed=$(printf '%s\n' "$result" | awk 'NF { line=$0 } END { print line }')
[[ "$changed" == "1" ]] || die "Aucune désignation effectuée (${changed:-vide})."

supers_after=$(mysql_n -e "SELECT COUNT(*) FROM User WHERE role = 'SUPER_ADMIN'")
admins_after=$(mysql_n -e "SELECT COUNT(*) FROM User WHERE role = 'ADMIN'")
others_after=$(mysql_n -e "SELECT phone FROM User WHERE role = 'ADMIN' ORDER BY phone")
designated=$(mysql_n -e "SELECT role FROM User WHERE phone = '${phone}'")
[[ "$supers_after" == "1" && "$designated" == "SUPER_ADMIN" ]] || die "Contrôle après écriture refusé."
[[ "$admins_after" == "$((admins_before - 1))" ]] || die "Le nombre d'administrateurs a changé de façon inattendue."
[[ "$others_before" == "$others_after" ]] || die "Un autre administrateur a changé de rôle."
echo "Super administrateur désigné : ${phone}. Les ${admins_after} autres administrateurs sont inchangés."
