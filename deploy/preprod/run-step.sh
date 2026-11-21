#!/usr/bin/env bash
# One preproduction step. The script stops at the first failed command.
#   bash deploy/preprod/run-step.sh preflight <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh rotate
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh deploy <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh restore
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh cycle
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh auth-simple-cycle <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh monetisation <commit>
#   WAGESSE_PREPROD_AUTHORIZE=yes bash deploy/preprod/run-step.sh super-admin <telephone>
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
    [[ "${2:-}" =~ ^[0-9a-f]{40}$ ]] || { echo "Commit déployé requis." >&2; exit 1; }
    bash "$DIR/auth-simple-cycle.sh" "$2"
    ;;
  monetisation)
    [[ -n "${2:-}" ]] || { echo "Commit complet requis." >&2; exit 1; }
    bash "$DIR/deploy-monetisation.sh" "$2"
    ;;
  super-admin)
    [[ -n "${2:-}" ]] || { echo "Téléphone de l'administrateur requis." >&2; exit 1; }
    bash "$DIR/designate-super-admin.sh" "$2"
    ;;
  *)
    echo "Étape inconnue. Utiliser preflight, rotate, deploy, restore, cycle, auth-simple, auth-simple-cycle, monetisation ou super-admin." >&2
    exit 1
    ;;
esac
