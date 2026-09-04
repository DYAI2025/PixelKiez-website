#!/usr/bin/env bash
set -euo pipefail

NETWORK="pixelkiez-ci-${GITHUB_RUN_ID:-local}-$$"
API_NAME="pixelkiez-api-ci-${GITHUB_RUN_ID:-local}-$$"
WEB_NAME="pixelkiez-web-ci-${GITHUB_RUN_ID:-local}-$$"
WEB_PORT="18080"

cleanup() {
  docker rm -f "$WEB_NAME" "$API_NAME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NETWORK" >/dev/null

docker run -d --name "$API_NAME" --network "$NETWORK" \
  -e PORT=3000 \
  -e MAIL_DRYRUN=1 \
  -e ALLOWED_ORIGIN=https://pixelkiez.de \
  pixelkiez-api-ci >/dev/null

docker run -d --name "$WEB_NAME" --network "$NETWORK" \
  -p "127.0.0.1:${WEB_PORT}:80" \
  -e API_UPSTREAM="${API_NAME}:3000" \
  pixelkiez-web-ci >/dev/null

wait_http() {
  local url="$1"
  for _ in $(seq 1 60); do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  echo "Timed out waiting for $url" >&2
  docker logs "$WEB_NAME" >&2 || true
  docker logs "$API_NAME" >&2 || true
  return 1
}

wait_http "http://127.0.0.1:${WEB_PORT}/"
wait_http "http://127.0.0.1:${WEB_PORT}/api/health"

headers="$(mktemp)"
body="$(mktemp)"
trap 'rm -f "$headers" "$body"; cleanup' EXIT

curl --fail --silent --show-error -D "$headers" -o "$body" \
  "http://127.0.0.1:${WEB_PORT}/"

grep -qi '^X-Content-Type-Options: nosniff' "$headers"
grep -qi '^X-Frame-Options: SAMEORIGIN' "$headers"
grep -qi '^Referrer-Policy: strict-origin-when-cross-origin' "$headers"
grep -qi '^Cache-Control: public, max-age=300' "$headers"
grep -q '<!doctype html' "$body"

health="$(curl --fail --silent --show-error "http://127.0.0.1:${WEB_PORT}/api/health")"
node -e '
const h = JSON.parse(process.argv[1]);
if (h.ok !== true) throw new Error("health not ok");
if (h.versandbereit !== false) throw new Error("CI dry-run must not claim delivery readiness");
' "$health"

post='{"name":"CI Test","kontakt":"ci@example.com","ausgangspunkt":"Website ist veraltet","anliegen":"Container integration smoke","quelle":"/ci","consent":true}'
response="$(curl --fail --silent --show-error \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-For: 198.51.100.99' \
  --data "$post" \
  "http://127.0.0.1:${WEB_PORT}/api/kontakt")"
node -e '
const r = JSON.parse(process.argv[1]);
if (r.ok !== true) throw new Error("contact smoke was not accepted");
if (!/nicht versendet/i.test(r.hinweis || "")) throw new Error("dry-run must explicitly state non-delivery");
' "$response"

echo "Container integration smoke passed"
