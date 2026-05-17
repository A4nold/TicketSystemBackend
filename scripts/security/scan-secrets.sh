#!/usr/bin/env bash

set -euo pipefail

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for security scanning."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EXCLUDES=(
  "--glob=!node_modules/**"
  "--glob=!frontend/node_modules/**"
  "--glob=!mobile/node_modules/**"
  "--glob=!.next/**"
  "--glob=!dist/**"
  "--glob=!coverage/**"
  "--glob=!.git/**"
)

PATTERNS=(
  "sk_live_[A-Za-z0-9]+"
  "sk_test_[A-Za-z0-9]{20,}"
  "whsec_[A-Za-z0-9]+"
  "re_[A-Za-z0-9]{20,}"
  "AIza[0-9A-Za-z\\-_]{20,}"
  "-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----"
  "postgresql://[^[:space:]]+:[^[:space:]]+@"
  "JWT_SECRET\\s*=\\s*\"?[A-Za-z0-9+/=]{24,}\"?"
)

ALLOWLIST=(
  ".env"
  ".env.local"
  ".env.example"
  "mobile/.env"
  "frontend/.env.local"
  "README.md"
  "prisma.config.ts"
  "scripts/security/scan-secrets.sh"
)

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

echo "Running secret scan..."

for pattern in "${PATTERNS[@]}"; do
  rg -n --hidden "${EXCLUDES[@]}" -e "$pattern" . >>"$TMP_FILE" || true
done

if [[ ! -s "$TMP_FILE" ]]; then
  echo "No potential secrets found."
  exit 0
fi

FILTERED_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE" "$FILTERED_FILE"' EXIT

cp "$TMP_FILE" "$FILTERED_FILE"

for allowed in "${ALLOWLIST[@]}"; do
  grep -v "^\\./${allowed}:" "$FILTERED_FILE" > "${FILTERED_FILE}.tmp" || true
  mv "${FILTERED_FILE}.tmp" "$FILTERED_FILE"
done

if [[ -s "$FILTERED_FILE" ]]; then
  echo "Potential secrets detected in tracked files:"
  cat "$FILTERED_FILE"
  echo
  echo "Review findings and move secrets to ignored env files or secret managers."
  exit 1
fi

echo "No potential secrets found outside local allowlist files."
