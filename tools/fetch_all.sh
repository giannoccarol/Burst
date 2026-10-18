#!/usr/bin/env bash
# Download every source model used by the game (see tools/sketchfab_fetch.sh).
set -uo pipefail
cd "$(dirname "$0")"
while read -r slug uid; do
  [ -z "$slug" ] && continue
  ./sketchfab_fetch.sh "$slug" "$uid" || echo "$slug: FAILED ($?)"
done <<'EOF'
carbine 62977bb4c53047a185b9f3a0cdf56b87
sniper cdefd833b4b5407ba32c53c9e7f50cae
smg ea3dad7478624495a5a46f40127b0579
lmg 8c24d7374ea64bdab1c30f49c69d5ed8
shotgun 2f5b48d9904145a39c1c2fcc6e5579b7
revolver a34b6d0ddc774744bc3567d6afc0878f
pistol 3fd71d1398b7425cba55d62fc22e37ec
knife f3140db917cc43389c14b5b2536c1dc8
fps_arms 08ec4403a47645d8ad80633abf13d39d
tp_soldier 0634f275b68747b79f6f2925a8c26a0f
soldier_ru e9aa211b67264dc086af1d2f4d4e3d84
soldier_uk 38b98a0222ff41acbe9bad7fe31c4b6c
g28 997840668e1e4c1384c7220563323085
rpg7 99c0af8a1803490a86edc48cd3bfc700
law 70814e3b3a0e40bdad0235c6f5637047
rpg7_tb 01c0fa7bb9e0439cac27264b3119a3fd
bazooka_tb 6b1d0c8c2f78483d8b398b8d923a8928
uar10 759c7788575c468d908a59c7a7405c05
EOF
