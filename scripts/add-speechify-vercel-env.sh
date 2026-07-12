#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${SPEECHIFY_API_KEY:-}" ]]; then
  if [[ -f .env.local ]] && grep -q '^SPEECHIFY_API_KEY=.' .env.local 2>/dev/null; then
    # shellcheck disable=SC1091
    source .env.local
  fi
fi

if [[ -z "${SPEECHIFY_API_KEY:-}" ]]; then
  echo "SPEECHIFY_API_KEY is not set."
  echo "Get one at https://platform.speechify.ai/api-keys"
  echo "Then run: SPEECHIFY_API_KEY=sk_... $0"
  exit 1
fi

for env in production preview development; do
  echo "Adding SPEECHIFY_API_KEY to ${env}..."
  vercel env add SPEECHIFY_API_KEY "$env" --value "$SPEECHIFY_API_KEY" --yes --sensitive --force 2>/dev/null \
    || vercel env add SPEECHIFY_API_KEY "$env" --value "$SPEECHIFY_API_KEY" --yes --sensitive
done

# Optional voice/model overrides if present in the environment
if [[ -n "${SPEECHIFY_VOICE:-}" ]]; then
  for env in production preview development; do
    echo "Adding SPEECHIFY_VOICE=${SPEECHIFY_VOICE} to ${env}..."
    vercel env add SPEECHIFY_VOICE "$env" --value "$SPEECHIFY_VOICE" --yes --force 2>/dev/null \
      || vercel env add SPEECHIFY_VOICE "$env" --value "$SPEECHIFY_VOICE" --yes
  done
fi

if [[ -n "${SPEECHIFY_MODEL:-}" ]]; then
  for env in production preview development; do
    echo "Adding SPEECHIFY_MODEL=${SPEECHIFY_MODEL} to ${env}..."
    vercel env add SPEECHIFY_MODEL "$env" --value "$SPEECHIFY_MODEL" --yes --force 2>/dev/null \
      || vercel env add SPEECHIFY_MODEL "$env" --value "$SPEECHIFY_MODEL" --yes
  done
fi

echo "Redeploying production..."
vercel --prod --yes

echo "Done. Test read-aloud on /story (button says Read aloud)."
echo "Health check: GET /api/voice-health — expect tts: \"speechify\"."
