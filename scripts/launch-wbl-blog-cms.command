#!/bin/zsh
set -euo pipefail

APP_DIR="/Users/laladimalanta/writings"
WEB_PORT="4321"
API_PORT="8792"
LOG_DIR="$APP_DIR/.cms-logs"
URL="http://127.0.0.1:${WEB_PORT}/swahg-blog-database/"
PYTHON_BIN="/opt/homebrew/bin/python3"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

is_listening() {
  /usr/sbin/lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries=0
  until /usr/bin/curl -fsS "$url" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      echo "$label did not start. Check logs in $LOG_DIR"
      exit 1
    fi
    sleep 1
  done
}

if ! is_listening "$API_PORT"; then
  echo "Starting WBL CMS action server..."
  /usr/bin/nohup "$PYTHON_BIN" "$APP_DIR/scripts/wbl-blog-action-server.py" > "$LOG_DIR/action-server.log" 2>&1 &
else
  echo "WBL CMS action server is already running."
fi

if ! is_listening "$WEB_PORT"; then
  echo "Starting WBL CMS web app..."
  /usr/bin/nohup /usr/bin/env npm run dev -- --host 127.0.0.1 --port "$WEB_PORT" > "$LOG_DIR/web-app.log" 2>&1 &
else
  echo "WBL CMS web app is already running."
fi

wait_for_url "http://127.0.0.1:${API_PORT}/health" "Action server"
wait_for_url "$URL" "Web app"

echo "Opening WBL Blog CMS..."
/usr/bin/open "$URL"

echo ""
echo "WBL Blog CMS is running:"
echo "$URL"
echo ""
echo "Logs:"
echo "$LOG_DIR/action-server.log"
echo "$LOG_DIR/web-app.log"
