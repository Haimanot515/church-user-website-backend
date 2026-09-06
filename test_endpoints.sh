#!/bin/bash
BASE="http://localhost:5000/api"

echo "=== LANGUAGES ==="
curl -s "$BASE/languages" | head -c 300; echo

echo "=== CATEGORIES ==="
curl -s "$BASE/categories" -H "Accept-Language: en" | head -c 300; echo

echo "=== POSTS ==="
curl -s "$BASE/posts" -H "Accept-Language: en" | head -c 300; echo

echo "=== POSTS - LATEST ==="
curl -s "$BASE/posts/latest" -H "Accept-Language: en" | head -c 300; echo

echo "=== POSTS - FEATURED ==="
curl -s "$BASE/posts/featured" -H "Accept-Language: en" | head -c 300; echo

echo "=== MEDIA ==="
curl -s "$BASE/media" | head -c 300; echo

echo "=== CHURCHES ==="
curl -s "$BASE/churches" -H "Accept-Language: en" | head -c 300; echo

echo "=== CHURCHES - PRIMARY ==="
curl -s "$BASE/churches/primary" -H "Accept-Language: en" | head -c 300; echo

echo "=== CHURCH STORY ==="
curl -s "$BASE/church-story" -H "Accept-Language: en" | head -c 300; echo

echo "=== CHURCH PERSONS ==="
curl -s "$BASE/church-persons" -H "Accept-Language: en" | head -c 300; echo

echo "=== MISSION VISION ==="
curl -s "$BASE/mission-vision" -H "Accept-Language: en" | head -c 300; echo

echo "=== BANK ACCOUNTS ==="
curl -s "$BASE/bank-accounts" | head -c 300; echo

echo "=== SERVICES ==="
curl -s "$BASE/services" -H "Accept-Language: en" | head -c 300; echo

echo "=== FAQ ==="
curl -s "$BASE/faq" -H "Accept-Language: en" | head -c 300; echo

echo "=== FAQ CATEGORIES ==="
curl -s "$BASE/faq/categories" | head -c 300; echo

echo "=== ABOUT ==="
curl -s "$BASE/about" -H "Accept-Language: en" | head -c 300; echo

echo "=== PROMOTIONS ==="
curl -s "$BASE/promotions" -H "Accept-Language: en" | head -c 300; echo

echo "=== PROMOTIONS - LATEST ==="
curl -s "$BASE/promotions/latest" -H "Accept-Language: en" | head -c 300; echo

echo "=== HOME HEROES ==="
curl -s "$BASE/homeheros" -H "Accept-Language: en" | head -c 300; echo

echo "=== LANDING HERO ==="
curl -s "$BASE/landingheros" | head -c 300; echo

echo "=== SUBSCRIBERS (list) ==="
curl -s "$BASE/subscribers" | head -c 300; echo

echo "=== SUBSCRIBE (POST) ==="
curl -s -X POST "$BASE/subscribers/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"testsubscriber@example.com"}' | head -c 300; echo

echo "=== CONTACT (POST) ==="
curl -s -X POST "$BASE/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@example.com","message":"Hello, testing the contact form."}' | head -c 300; echo

echo "=== AUTH REGISTER (POST) ==="
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"newuser@example.com","password":"TestPass123!"}' | head -c 300; echo

echo "=== AUTH LOGIN (POST, using seeded admin) ==="
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}' | head -c 500; echo

echo "=== DONE ==="
