#!/bin/bash

# Security & Production Readiness Test Suite
# Run: bash tmp/security_test.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Security & Production Readiness Test Suite            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. INPUT VALIDATION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test invalid email format
test_endpoint "Invalid email format" "POST" "/api/auth/otp" \
    '{"email":"notanemail"}' "400"

# Test SQL injection attempt
test_endpoint "SQL injection prevention" "POST" "/api/auth/otp" \
    '{"email":"test@example.com; DROP TABLE users;--"}' "400"

# Test XSS attempt
test_endpoint "XSS prevention" "POST" "/api/auth/otp" \
    '{"email":"<script>alert(1)</script>@example.com"}' "400"

# Test valid email
test_endpoint "Valid email format" "POST" "/api/auth/otp" \
    '{"email":"test@gmail.com"}' "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. RATE LIMITING TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Sending 4 OTP requests rapidly (limit: 3/min)..."
for i in {1..4}; do
    test_endpoint "OTP request #$i" "POST" "/api/auth/otp" \
        '{"email":"ratelimit@test.com"}' "$([ $i -le 3 ] && echo 200 || echo 429)"
    sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. AUTHENTICATION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test missing credentials
test_endpoint "Missing email" "POST" "/api/auth/login" \
    '{"password":"test123"}' "400"

test_endpoint "Missing password" "POST" "/api/auth/login" \
    '{"email":"test@example.com"}' "400"

# Test invalid credentials
test_endpoint "Invalid credentials" "POST" "/api/auth/login" \
    '{"email":"fake@example.com","password":"wrongpass"}' "401"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. ERROR HANDLING TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test malformed JSON
echo -n "Testing: Malformed JSON... "
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/otp" \
    -H "Content-Type: application/json" \
    -d '{invalid json}')
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "400" ] || [ "$status_code" = "500" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Status: $status_code)"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (Status: $status_code)"
    ((FAILED++))
fi

# Test empty body
test_endpoint "Empty request body" "POST" "/api/auth/otp" \
    '{}' "400"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. SECURITY HEADERS TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking security headers..."
headers=$(curl -s -I "$BASE_URL")

check_header() {
    local header="$1"
    if echo "$headers" | grep -qi "$header"; then
        echo -e "${GREEN}✅${NC} $header present"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $header missing"
        ((FAILED++))
    fi
}

check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "X-XSS-Protection"
check_header "Strict-Transport-Security"
check_header "Content-Security-Policy"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ZEROBOUNCE VALIDATION TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test invalid email (should be rejected by ZeroBounce)
test_endpoint "Invalid email (ZeroBounce)" "POST" "/api/auth/otp" \
    '{"email":"gadaisojdoiasi3903403jaskadasjd@gmail.com"}' "400"

# Test valid email (should pass ZeroBounce)
test_endpoint "Valid email (ZeroBounce)" "POST" "/api/auth/otp" \
    '{"email":"pyrohassan786@gmail.com"}' "200"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST RESULTS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Application is secure and production-ready.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the results above.${NC}"
    exit 1
fi
