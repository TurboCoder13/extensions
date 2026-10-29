#!/usr/bin/env bash
set -euo pipefail

# Derive CI scope from Renovate's allowlist so the two cannot drift apart.
extensions=()
while IFS= read -r extension; do
	if git cat-file -e "HEAD:${extension}/package.json" 2>/dev/null; then
		extensions+=("${extension}")
	fi
done < <(jq -r '
  .packageRules[] | select(.enabled == true) | .matchFileNames[]
  | select(startswith("extensions/")) | rtrimstr("/**")
' renovate.json)

matrix=$(printf '%s\n' "${extensions[@]}" | jq -Rsc 'split("\n") | map(select(length > 0))')
printf 'extensions=%s\n' "${matrix}" >>"${GITHUB_OUTPUT}"
