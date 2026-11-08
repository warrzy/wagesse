#!/usr/bin/env bash
# One preproduction step. The script stops at the first failed command.
#   bash deploy/preprod/run-step.sh preflight <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh rotate
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh deploy <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh restore
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh cycle
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple-cycle
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
step="${1:-}"
case "$step" in
  preflight)
    bash "$DIR/preflight.sh" "${2:-}"
    ;;
  rotate)
    bash "$DIR/rotate-recette-secrets.sh"
    ;;
  deploy)
    [[ -n "${2:-}" ]] || { echo "Commit complet requis." >&2; exit 1; }
    bash "$DIR/apply-recette-fixes.sh" "$2"
    ;;
  restore)
    bash "$DIR/restore-check.sh"
    ;;
  cycle)
    bash "$DIR/recette-cycle.sh"
    ;;
  auth-simple)
    [[ -n "${2:-}" ]] || { echo "Commit complet requis." >&2; exit 1; }
    bash "$DIR/deploy-auth-simple.sh" "$2"
    ;;
  auth-simple-cycle)
    bash "$DIR/auth-simple-cycle.sh"
    ;;
  *)
    echo "Étape inconnue. Utiliser preflight, rotate, deploy, restore, cycle, auth-simple ou auth-simple-cycle." >&2
    exit 1
    ;;
esac
