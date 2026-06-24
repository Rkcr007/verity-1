#!/usr/bin/env bash
# Rebuild the offline HTML from the markdown docs and open it.
# Works from any directory.
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/build-html.mjs"
open "$DIR/index.html"
