
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 MAP_NAME [--update]" >&2
  exit 1
fi

MAP="$1"
UPDATE=0
if [[ ${2-} == "--update" ]]; then
  UPDATE=1
fi

# Some CSVs use short names while the wiki pages contain spaces
case "$MAP" in
  TheIsland) MAP_API="The Island" ;;
  TheCenter) MAP_API="The Center" ;;
  ScorchedEarth) MAP_API="Scorched Earth" ;;
  CrystalIsles) MAP_API="Crystal Isles" ;;
  Genesis1) MAP_API="Genesis: Part 1" ;;
  Genesis2) MAP_API="Genesis: Part 2" ;;
  *) MAP_API="$MAP" ;;
esac

ENCODED_MAP=$(python3 - "$MAP_API" <<'PY'
import urllib.parse, sys
import sys
print(urllib.parse.quote(sys.argv[1]))
PY
)

URL="https://ark.wiki.gg/api.php?action=parse&page=Data:Maps/Resources/${ENCODED_MAP}/ASA&prop=wikitext&format=json"
DATA=$(curl -s "$URL")
MARKERS=$(echo "$DATA" | jq -r '.parse.wikitext["*"] | fromjson | .markers')

echo "$MARKERS" | jq -r 'to_entries[] | .key as $g | .value[] | "\($g),\(.y),\(.x)"'

if [[ $UPDATE -eq 1 ]]; then
  CSV="$(dirname "$0")/data/${MAP}.csv"
  if [[ ! -f "$CSV" ]]; then
    echo "CSV file $CSV not found" >&2
    exit 1
  fi
  HEADER=$(head -n 1 "$CSV")
  TEMP=$(mktemp)
  echo "$HEADER" > "$TEMP"
  echo "$MARKERS" | jq -r --arg map "$MAP" '
    to_entries[] | $map + "," + .key + ",[" + (.value | map("("+(.y|tostring)+","+(.x|tostring)+")") | join(", ")) + "]" + ",,,,,,,,,,,,,,,"' >> "$TEMP"
  mv "$TEMP" "$CSV"
fi
