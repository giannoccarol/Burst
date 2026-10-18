#!/usr/bin/env bash
# Download one Sketchfab model into its own new, empty directory under assets/src/<slug>/.
#
#   tools/sketchfab_fetch.sh <slug> <uid>
#
# - re-checks the license right before downloading: only CC0 and CC Attribution (CC-BY) are accepted
# - the API token (read from .secrets/sketchfab.env) is only ever sent to api.sketchfab.com
# - prefers the .glb archive, falls back to the glTF zip (extracted inside the same directory)
# - writes meta.json next to the download (title, author, url, license) for tools/build_assets.py
# Downloaded files are untrusted data: nothing inside the directory is ever executed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
slug="$1"; uid="$2"
[[ "$slug" =~ ^[a-z0-9_]+$ ]] || { echo "bad slug"; exit 1; }
[[ "$uid" =~ ^[0-9a-f]{32}$ ]] || { echo "bad uid"; exit 1; }
dir="$ROOT/assets/src/$slug"
if [ -e "$dir/model.glb" ] || [ -e "$dir/gltf" ]; then echo "$slug: already downloaded"; exit 0; fi
if [ -e "$dir" ] && [ -n "$(ls -A "$dir" | grep -v '^meta.json$')" ]; then echo "$slug: directory not empty, skipped"; exit 4; fi
mkdir -p "$dir"

info=""
for try in 1 2 3 4 5 6; do info="$(curl -sf "https://api.sketchfab.com/v3/models/$uid")" && break; sleep 20; done
[ -n "$info" ] || { echo "$slug: model API failed"; exit 6; }
lic="$(printf '%s' "$info" | jq -r '.license.slug // ""')"
case "$lic" in
  by|cc0) ;;
  *) echo "$slug: license '$lic' not accepted, skipped"; rm -f "$dir/meta.json"; rmdir "$dir"; exit 2 ;;
esac
printf '%s' "$info" | jq '{uid, title: .name, author: .user.displayName, authorUser: .user.username, authorUrl: .user.profileUrl, url: .viewerUrl, license: .license.label, licenseUrl: .license.url, licenseSlug: .license.slug}' > "$dir/meta.json"

TOKEN="$(sed -n 's/^SKETCHFAB_TOKEN=//p' "$ROOT/.secrets/sketchfab.env")"
dl=""
for try in 1 2 3 4 5 6; do   # the download API rate-limits bursts (HTTP 429)
  dl="$(curl -sf -H "Authorization: Token $TOKEN" "https://api.sketchfab.com/v3/models/$uid/download")" && break
  sleep 20
done
unset TOKEN
[ -n "$dl" ] || { echo "$slug: download API failed"; exit 5; }
glb="$(printf '%s' "$dl" | jq -r '.glb.url // ""')"
gltf="$(printf '%s' "$dl" | jq -r '.gltf.url // ""')"
if [ -n "$glb" ]; then
  curl -sfL -o "$dir/model.glb" "$glb"   # temporary storage URL: no Authorization header
elif [ -n "$gltf" ]; then
  curl -sfL -o "$dir/model.zip" "$gltf"
  mkdir -p "$dir/gltf"
  unzip -q -o "$dir/model.zip" -d "$dir/gltf"
else
  echo "$slug: no download available"; exit 3
fi
echo "$slug: ok ($(du -sh "$dir" | cut -f1)) license=$lic"
