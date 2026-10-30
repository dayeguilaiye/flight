#!/usr/bin/env bash
set -euo pipefail
base="${1:?Usage: scripts/smoke.sh https://www.hitnrun.cn}"
base="${base%/}"
curl_options=()
if [ -n "${FLIGHT_SMOKE_RESOLVE:-}" ]; then
  curl_options+=(--resolve "$FLIGHT_SMOKE_RESOLVE")
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl "${curl_options[@]}" --fail --silent --show-error --retry 5 --retry-delay 5 --retry-all-errors \
  --connect-timeout 10 --max-time 30 "$base/api/health" > "$tmp/health.json"
python3 - "$tmp/health.json" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    assert json.load(source)['status'] == 'ok', 'Unhealthy API'
PY
for path in / /music-theory /music-theory/lab /gorm-vs-sqlc /llm-api-tester; do
  status="$(curl "${curl_options[@]}" --silent --show-error --connect-timeout 10 --max-time 30 \
    --output "$tmp/page.html" --write-out '%{http_code}' "$base$path")"
  test "$status" = 200
  grep -q 'id="root"' "$tmp/page.html"
done
asset="$(python3 - "$tmp/page.html" <<'PY'
import re, sys
with open(sys.argv[1]) as source:
    print(re.search(r'<script[^>]+src="([^"]+)"', source.read())[1])
PY
)"
curl "${curl_options[@]}" --fail --silent --show-error --connect-timeout 10 --max-time 30 \
  "$base$asset" -o "$tmp/asset.js"
test -s "$tmp/asset.js"
echo "Flight API, frontend routes and JavaScript asset are healthy."
