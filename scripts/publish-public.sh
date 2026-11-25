#!/usr/bin/env bash
# Sync the committed state of this repo into the public copy (../pf-tutor): everything except the instructor's course
# source files, the private master prompt and build caches. Keeps the public repo's .git, .vercel, LICENSE and README header.
# Usage (from the project root, after committing):  bash scripts/publish-public.sh
set -euo pipefail
SRC="$(pwd)"; DST="$(cd .. && pwd)/pf-tutor"
[ -d "$DST/.git" ] || { echo "no public repo at $DST"; exit 1; }
HEADER="$(sed -n '1,/^A free, no-login/p' "$DST/README.md" | sed '$d')"   # title + deploy button + open-source paragraph
find "$DST" -mindepth 1 -maxdepth 1 ! -name .git ! -name .vercel ! -name LICENSE ! -name .env.local ! -name node_modules ! -name .next -exec rm -rf {} +
git -C "$SRC" archive HEAD | tar -x -C "$DST"
rm -rf "$DST/content-source" "$DST/MASTER_PROMPT.md" "$DST/tsconfig.tsbuildinfo"
BODY="$(sed '1,2d' "$DST/README.md")"
printf '%s\n\n%s\n' "$HEADER" "$BODY" > "$DST/README.md"
grep -q '^\.vercel' "$DST/.gitignore" || printf '\n.vercel\n' >> "$DST/.gitignore"
echo "public copy synced: $(find "$DST" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/.next/*' | wc -l) files"
