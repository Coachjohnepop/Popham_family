#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${DEEPGRAM_API_KEY:-}" ]]; then
  if [[ -f .env.local ]] && grep -q '^DEEPGRAM_API_KEY=.' .env.local 2>/dev/null; then
    # shellcheck disable=SC1091
    source .env.local
  fi
fi

if [[ -z "${DEEPGRAM_API_KEY:-}" ]]; then
  echo "DEEPGRAM_API_KEY is not set."
  echo "Get one at https://console.deepgram.com/"
  echo "Then run: DEEPGRAM_API_KEY=... $0"
  exit 1
fi

for env in production preview development; do
  echo "Adding DEEPGRAM_API_KEY to ${env}..."
  vercel env add DEEPGRAM_API_KEY "$env" --value "$DEEPGRAM_API_KEY" --yes --sensitive --force 2>/dev/null \
    || vercel env add DEEPGRAM_API_KEY "$env" --value "$DEEPGRAM_API_KEY" --yes --sensitive
done

echo "Redeploying production..."
vercel --prod --yes

echo "Done. Test voice on /story/salem-witch-trials"