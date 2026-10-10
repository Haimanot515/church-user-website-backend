#!/bin/bash
# Smoke test against a running server.
# Usage:
#   BASE=http://localhost:5000/api TEST_EMAIL=you@example.com TEST_PASSWORD='...' ./test_endpoints.sh
# TEST_EMAIL / TEST_PASSWORD are only needed for the authenticated checks.
BASE="${BASE:-http://localhost:5000/api}"

show() { head -c 300; echo; }

echo "=== HEALTH ===";            curl -s "$BASE/health" | show
echo "=== LANGUAGES ===";         curl -s "$BASE/languages" | show
for path in categories posts posts/latest posts/featured churches churches/primary \
            church-story church-persons mission-vision services faq about promotions \
            promotions/latest homeheros; do
  echo "=== ${path^^} ==="
  curl -s "$BASE/$path" -H "Accept-Language: en" | show
done
echo "=== MEDIA ===";             curl -s "$BASE/media" | show
echo "=== BANK ACCOUNTS ===";     curl -s "$BASE/bank-accounts" | show
echo "=== FAQ CATEGORIES ===";    curl -s "$BASE/faq/categories" | show
echo "=== LANDING HERO ===";      curl -s "$BASE/landingheros" | show

echo "=== SUBSCRIBE (POST) ==="
curl -s -X POST "$BASE/subscribers" -H "Content-Type: application/json" \
  -d '{"email":"testsubscriber@example.com"}' | show

echo "=== ADMIN ROUTES MUST BE PROTECTED (expect 401) ==="
curl -s -o /dev/null -w "GET /admin/messages/x -> %{http_code}\n" "$BASE/admin/messages/x"
curl -s -o /dev/null -w "GET /admin/users      -> %{http_code}\n" "$BASE/admin/users"
curl -s -o /dev/null -w "GET /subscribers      -> %{http_code}\n" "$BASE/subscribers"

if [ -n "$TEST_EMAIL" ] && [ -n "$TEST_PASSWORD" ]; then
  echo "=== LOGIN ==="
  RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
  echo "$RESP" | head -c 200; echo
  TOKEN=$(echo "$RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  if [ -n "$TOKEN" ]; then
    echo "=== CONTACT (POST, authenticated) ==="
    curl -s -X POST "$BASE/contact" -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"message":"Hello, testing the contact form."}' | show
  fi
else
  echo "(skipping login/contact: set TEST_EMAIL and TEST_PASSWORD)"
fi
echo "=== DONE ==="
