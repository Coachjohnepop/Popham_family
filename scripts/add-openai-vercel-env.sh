#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  if [[ -f .env.local ]] && grep -q '^OPENAI_API_KEY=.' .env.local 2>/dev/null; then
    # shellcheck disable=SC1091
    source .env.local
  fi
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "OPENAI_API_KEY is not set."
  echo "Get one at https://platform.openai.com/api-keys"
  echo "Then run: OPENAI_API_KEY=sk-... $0"
  exit 1
fi

for env in production preview development; do
  echo "Adding OPENAI_API_KEY to ${env}..."
  vercel env add OPENAI_API_KEY "$env" --value "$OPENAI_API_KEY" --yes --sensitive --force 2>/dev/null \
    || vercel env add OPENAI_API_KEY "$env" --value "$OPENAI_API_KEY" --yes --sensitive
done

echo "Redeploying production..."
vercel --prod --yes

echo "Done. Test voice on /story/salem-witch-trials"