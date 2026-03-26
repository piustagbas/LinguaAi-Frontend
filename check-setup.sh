#!/bin/bash

# LinguaAICall Setup Verification Script
echo "🔍 Checking LinguaAICall Setup..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo -e "${BLUE}=== System Requirements ===${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not found"
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
    check_pass "MongoDB installed"
    
    # Check if MongoDB is running
    if pgrep -x "mongod" > /dev/null; then
        check_pass "MongoDB is running"
    else
        check_warn "MongoDB is installed but not running"
        echo "   Start with: brew services start mongodb-community"
    fi
else
    check_warn "MongoDB not found locally (you can use MongoDB Atlas)"
fi

echo ""
echo -e "${BLUE}=== Project Setup ===${NC}"

# Check if node_modules exists in root
if [ -d "node_modules" ]; then
    check_pass "Frontend dependencies installed"
else
    check_fail "Frontend dependencies not installed"
    echo "   Run: npm install"
fi

# Check if backend node_modules exists
if [ -d "backend/node_modules" ]; then
    check_pass "Backend dependencies installed"
else
    check_fail "Backend dependencies not installed"
    echo "   Run: cd backend && npm install"
fi

# Check if backend .env exists
if [ -f "backend/.env" ]; then
    check_pass "Backend .env file exists"
    
    # Check for required env variables
    if grep -q "JWT_SECRET" backend/.env && grep -q "MONGODB_URI" backend/.env; then
        check_pass "Required environment variables present"
    else
        check_warn "Some environment variables may be missing"
    fi
else
    check_fail "Backend .env file missing"
    echo "   Copy from: cp backend/.env.example backend/.env"
fi

echo ""
echo -e "${BLUE}=== File Structure ===${NC}"

# Check key files exist
FILES=(
    "App.tsx"
    "backend/src/server.ts"
    "backend/src/app.ts"
    "contexts/AuthContext.tsx"
    "services/api.ts"
    "config/constants.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

echo ""
echo -e "${BLUE}=== Backend Connectivity ===${NC}"

# Check if backend is running
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    check_pass "Backend is running and accessible"
    
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
    if echo "$HEALTH_RESPONSE" | grep -q "success"; then
        check_pass "Backend health check returns success"
    fi
else
    check_warn "Backend is not running"
    echo "   Start with: cd backend && npm run dev"
fi

echo ""
echo -e "${BLUE}=== Network Configuration ===${NC}"

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ ! -z "$LOCAL_IP" ]; then
    check_pass "Local IP address: $LOCAL_IP"
    echo "   For physical device testing, use: http://$LOCAL_IP:5000/api"
else
    check_warn "Could not determine local IP address"
fi

echo ""
echo -e "${BLUE}=== Port Availability ===${NC}"

# Check if port 5000 is available or in use by our app
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    check_pass "Port 5000 is in use (backend may be running)"
else
    check_warn "Port 5000 is available (backend not running)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Passed: $PASS${NC} | ${RED}✗ Failed: $FAIL${NC} | ${YELLOW}⚠ Warnings: $WARN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 Setup looks good!${NC}"
    echo ""
    echo "To start development:"
    echo "  1. Terminal 1: cd backend && npm run dev"
    echo "  2. Terminal 2: npm start"
else
    echo -e "${RED}⚠️  Some issues found. Please fix them before continuing.${NC}"
    echo ""
    echo "Run './setup.sh' to fix common issues automatically."
fi
echo ""


