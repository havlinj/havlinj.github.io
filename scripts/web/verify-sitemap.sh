#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

test -f dist/sitemap-index.xml
test -f dist/sitemap-0.xml
grep -q 'why-this/' dist/sitemap-0.xml
grep -q 'contact/' dist/sitemap-0.xml
grep -q 'writing/' dist/sitemap-0.xml
grep -q 'profile/' dist/sitemap-0.xml
