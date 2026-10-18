#!/usr/bin/env bash
# Download every doctortex soldier built on the same Adobe Fuse / Mixamo base (CC-BY).
set -uo pipefail
cd "$(dirname "$0")"
while read -r slug uid; do
  [ -z "$slug" ] && continue
  ./sketchfab_fetch.sh "$slug" "$uid" || echo "$slug: FAILED ($?)"
  sleep 8
done <<'LIST'
soldier_ru e9aa211b67264dc086af1d2f4d4e3d84
soldier_uk 38b98a0222ff41acbe9bad7fe31c4b6c
soldier_ua 94f74f6bdd994733a8a40c7ff088e12f
soldier_ua2 b5d8f735b24c49f7ab5b9cc21af4b229
soldier_desert 2efdbacef9ca4d45846e16bebba05e03
soldier_snow b3da5a50991d4bf5bc3ff92d066c1871
soldier_navy afa60cf9541d44a3bc8ffa5d0dbfc4a3
soldier_marine 877f59bbf8374ea08c96155c8518f439
soldier_marine_desert c998c2326ef54cd8adac046599d82012
soldier_marine_wood 3ef17e7c4a854d6996b23bd96c6469f4
soldier_sniper e1201dde63a247f7acb232ccaced9270
soldier_mechanic e937e93ff2b643f799b67270ed3dbd9d
soldier_swat d821ff6ab1e4455c8313db4658a56097
LIST
