
#!/usr/bin/env bash

# === scripts/lint-and-format.sh ===

# Ukončit skript při jakékoliv chybě
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

ROOT_DIR="$SCRIPT_DIR/.."

echo "Přecházím do root adresáře projektu: $ROOT_DIR"
cd "$ROOT_DIR"

echo "Spouštím ESLint s fixy..."
npm run lint -- --fix

echo "Kontrola ESLint bez oprav..."
if ! npm run lint; then
  echo "ESLint stále hlásí chyby. Oprav je před spuštěním formátování."
  exit 1
fi

echo "ESLint prošel – spouštím Prettier..."
npm run format

echo "Hotovo!"