#!/usr/bin/env bash
# Render diagram sources into static/diagrams/*.svg
#
#   diagrams/*.dot -> graphviz
#   diagrams/*.edn -> bytefield-svg (via npx)
#
# Zola has no plugin system, so this runs before `zola build`. The generated
# SVGs are committed, which keeps `zola build` self-sufficient for anyone who
# clones without Graphviz or node installed.
set -euo pipefail

DOT=${DOT:-dot}
mkdir -p static/diagrams

shopt -s nullglob

for f in diagrams/*.dot; do
  command -v "$DOT" >/dev/null 2>&1 || { echo "dot not found; set DOT=..." >&2; exit 1; }
  name=$(basename "$f" .dot)
  out="static/diagrams/$name.svg"
  # Strip the XML prolog and the fixed pt dimensions: the SVG is inlined into
  # a page and should scale to its container, not to a print size.
  "$DOT" -Tsvg "$f" \
    | sed -e '/^<?xml/d' -e '/^<!DOCTYPE/d' -e '/Graphics\/SVG/d' \
          -e 's/<svg width="[0-9.]*pt" height="[0-9.]*pt"/<svg/' \
    > "$out"
  printf '  %-30s -> %s\n' "$f" "$out"
done

for f in diagrams/*.edn; do
  name=$(basename "$f" .edn)
  out="static/diagrams/$name.svg"
  npx --yes bytefield-svg@1.11.0 -s "$f" -o "$out.tmp"
  # Same treatment: drop the prolog and the fixed size so it scales.
  sed -e 's/<?xml[^?]*?>//' \
      -e 's/<svg \(xmlns[^>]*\)width="[0-9.]*" height="[0-9.]*"/<svg \1/' \
      "$out.tmp" > "$out"
  rm -f "$out.tmp"
  printf '  %-30s -> %s\n' "$f" "$out"
done
