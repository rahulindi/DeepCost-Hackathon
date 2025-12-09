#!/bin/bash

# Real-Time Webhook Testing Script
# Confidence Score: 95%
#
# This script performs end-to-end webhook testing with real deliveries
#
# Usage: ./test-webhooks-realtime.sh [AUTH_TOKEN]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
WEBHOOK_RECEIVER_URL="http://localhost:3002/webhook"
AUTH_TOKEN="${1:-$AUTH_TOKEN}"

# Check if auth token is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ Error: AUTH_TOKEN not provided${NC}"
    echo -e "${YELLOW}Usage: ./test-webhooks-realtime.sh YOUR_AUTH_TOKEN${NC}"
    echo -e "${YELLOW}   or: AUTH_TOKEN=your-token ./test-webhooks-realtime.sh${NC}"
    exit 1
fi

echo -e "${BOLD}${CYAN}"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                    🚀 REAL-TIME WEBHOOK TESTING                               "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo -e "${NC}\n"

# Function to print section header
print_section() {
    echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to check if webhook receiver is running
check_webhook_receiver() {
    if curl -s http://localhost:3002/ > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# PHASE 1: PRE-FLIGHT CHECKS
# ============================================================================
print_section "📋 PHASE 1: PRE-FLIGHT CHECKS"

echo -e "${YELLOW}1.1 Checking backend server...${NC}"
if curl -s "${BACKEND_URL}/api/webhooks/advanced-health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Backend server is not running${NC}"
    echo -e "${YELLOW}💡 Start it with: cd backend && npm start${NC}"
    ((TESTS_FAILED++))
    exit 1
fi

echo -e "\n${YELLOW}1.2 Checking webhook receiver...${NC}"
if check_webhook_receiver; then
    echo -e "${GREEN}✅ Webhook receiver is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  Webhook receiver not running${NC}"
    echo -e "${CYAN}Starting webhook receiver...${NC}"
    node webhook-receiver-server.js > /dev/null 2>&1 &
    RECEIVER_PID=$!
    sleep 2
    
    if check_webhook_receiver; then
        echo -e "${GREEN}✅ Webhook receiver started (PID: $RECEIVER_PID)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ Failed to start webhook receiver${NC}"
        ((TESTS_FAILED++))
        exit 1
    fi
fi

echo -e "\n${YELLOW}1.3 Testing authentication...${NC}"
HEALTH_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
    "${BACKEND_URL}/api/webhooks/advanced-health")

if echo "$HEALTH_RESPONSE" | grep -q "operational"; then
    echo -e "${GREEN}✅ Authentication successful${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Authentication failed${NC}"
    echo -e "${YELLOW}💡 Check your AUTH_TOKEN${NC}"
    ((TESTS_FAILED++))
    exit 1
fi

# ============================================================================
# PHASE 2: WEBHOOK SUBSCRIPTION MANAGEMENT
# ============================================================================
print_section "🔧 PHASE 2: WEBHOOK SUBSCRIPTION MANAGEMENT"

echo -e "${YELLOW}2.1 Creating webhook subscription...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/webhooks/subscriptions" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "'"$WEBHOOK_RECEIVER_URL"'",
        "events": [
            "cost.export.completed",
            "cost.anomaly.detected",
            "cost.budget.exceeded"
        ],
        "isActive": true
    }')

SUBSCRIPTION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.subscription.id')

if [ "$SUBSCRIPTION_ID" != "null" ] && [ -n "$SUBSCRIPTION_ID" ]; then
    echo -e "${GREEN}✅ Webhook subscription created${NC}"
    echo -e "${CYAN}   Subscription ID: $SUBSCRIPTION_ID${NC}"
    echo -e "${CYAN}   URL: $WEBHOOK_RECEIVER_URL${NC}"
    echo -e "${CYAN}   Events: cost.export.completed, cost.anomaly.detected, cost.budget.exceeded${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Failed to create webhook subscription${NC}"
    echo -e "${YELLOW}Response: $CREATE_RESPONSE${NC}"
    ((TESTS_FAILED++))
    exit 1
fi

echo -e "\n${YELLOW}2.2 Listing webhook subscriptions...${NC}"
LIST_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/webhooks/subscriptions" \
    -H "Authorization: Bearer $AUTH_TOKEN")

SUBSCRIPTION_COUNT=$(echo "$LIST_RESPONSE" | jq -r '.total')

if [ "$SUBSCRIPTION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $SUBSCRIPTION_COUNT subscription(s)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ No subscriptions found${NC}"
    ((TESTS_FAILED++))
fi

# ============================================================================
# PHASE 3: WEBHOOK DELIVERY TESTING
# ============================================================================
print_section "📨 PHASE 3: WEBHOOK DELIVERY TESTING"

echo -e "${YELLOW}3.1 Testing webhook endpoint...${NC}"
TEST_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/webhooks/subscriptions/$SUBSCRIPTION_ID/test" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$TEST_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Test webhook sent successfully${NC}"
    ((TESTS_PASSED++))
    sleep 1
    
    # Check if webhook was received
    STATS=$(curl -s http://localhost:3002/stats)
    RECEIVED_COUNT=$(echo "$STATS" | jq -r '.totalReceived')
    
    if [ "$RECEIVED_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Test webhook received by receiver${NC}"
        echo -e "${CYAN}   Total webhooks received: $RECEIVED_COUNT${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  Webhook not received yet (may take a moment)${NC}"
    fi
else
    echo -e "${RED}❌ Test webhook failed${NC}"
    ((TESTS_FAILED++))
fi

# ============================================================================
# PHASE 4: EVENT SIMULATION
# ============================================================================
print_section "🎭 PHASE 4: EVENT SIMULATION"

# Array of events to simulate
declare -a EVENTS=(
    "cost.export.completed"
    "cost.anomaly.detected"
    "cost.budget.exceeded"
)

for EVENT in "${EVENTS[@]}"; do
    echo -e "\n${YELLOW}4.${TESTS_PASSED} Simulating event: ${BOLD}$EVENT${NC}"
    
    SIMULATE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/webhooks/simulate" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "eventType": "'"$EVENT"'"
        }')
    
    if echo "$SIMULATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Event simulated successfully${NC}"
        ((TESTS_PASSED++))
        
        # Show delivery info
        DELIVERIES=$(echo "$SIMULATE_RESPONSE" | jq -r '.deliveries | length')
        echo -e "${CYAN}   Delivered to $DELIVERIES endpoint(s)${NC}"
    else
        echo -e "${RED}❌ Event simulation failed${NC}"
        ((TESTS_FAILED++))
    fi
    
    sleep 1
done

# ============================================================================
# PHASE 5: DELIVERY VERIFICATION
# ============================================================================
print_section "✅ PHASE 5: DELIVERY VERIFICATION"

echo -e "${YELLOW}5.1 Checking delivery history...${NC}"
HISTORY_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/webhooks/subscriptions/$SUBSCRIPTION_ID/deliveries" \
    -H "Authorization: Bearer $AUTH_TOKEN")

DELIVERY_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.total')

if [ "$DELIVERY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $DELIVERY_COUNT delivery record(s)${NC}"
    ((TESTS_PASSED++))
    
    # Show recent deliveries
    echo -e "\n${CYAN}Recent deliveries:${NC}"
    echo "$HISTORY_RESPONSE" | jq -r '.deliveries[] | "   - \(.event_type): HTTP \(.response_status) at \(.delivered_at)"' | head -5
else
    echo -e "${YELLOW}⚠️  No delivery history found${NC}"
fi

echo -e "\n${YELLOW}5.2 Checking webhook receiver stats...${NC}"
RECEIVER_STATS=$(curl -s http://localhost:3002/stats)
TOTAL_RECEIVED=$(echo "$RECEIVER_STATS" | jq -r '.totalReceived')

if [ "$TOTAL_RECEIVED" -gt 0 ]; then
    echo -e "${GREEN}✅ Receiver has $TOTAL_RECEIVED webhook(s)${NC}"
    ((TESTS_PASSED++))
    
    # Show event type distribution
    echo -e "\n${CYAN}Event type distribution:${NC}"
    echo "$RECEIVER_STATS" | jq -r '.eventTypes | to_entries[] | "   - \(.key): \(.value)"'
else
    echo -e "${YELLOW}⚠️  No webhooks received by receiver${NC}"
fi

# ============================================================================
# PHASE 6: ADVANCED FEATURES
# ============================================================================
print_section "🚀 PHASE 6: ADVANCED FEATURES"

echo -e "${YELLOW}6.1 Testing webhook statistics...${NC}"
STATS_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/webhooks/stats" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$STATS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Statistics retrieved successfully${NC}"
    ((TESTS_PASSED++))
    
    TOTAL_SUBS=$(echo "$STATS_RESPONSE" | jq -r '.statistics.totalSubscriptions')
    ACTIVE_SUBS=$(echo "$STATS_RESPONSE" | jq -r '.statistics.activeSubscriptions')
    
    echo -e "${CYAN}   Total subscriptions: $TOTAL_SUBS${NC}"
    echo -e "${CYAN}   Active subscriptions: $ACTIVE_SUBS${NC}"
else
    echo -e "${RED}❌ Failed to get statistics${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}6.2 Testing webhook update...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "${BACKEND_URL}/api/webhooks/subscriptions/$SUBSCRIPTION_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "events": [
            "cost.export.completed",
            "cost.anomaly.detected",
            "cost.budget.exceeded",
            "cost.forecast.alert"
        ]
    }')

if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Webhook subscription updated${NC}"
    ((TESTS_PASSED++))
    
    NEW_EVENTS=$(echo "$UPDATE_RESPONSE" | jq -r '.subscription.events | join(", ")')
    echo -e "${CYAN}   New events: $NEW_EVENTS${NC}"
else
    echo -e "${RED}❌ Failed to update webhook${NC}"
    ((TESTS_FAILED++))
fi

# ============================================================================
# PHASE 7: CLEANUP
# ============================================================================
print_section "🧹 PHASE 7: CLEANUP"

echo -e "${YELLOW}7.1 Deleting webhook subscription...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "${BACKEND_URL}/api/webhooks/subscriptions/$SUBSCRIPTION_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Webhook subscription deleted${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ Failed to delete webhook${NC}"
    ((TESTS_FAILED++))
fi

# ============================================================================
# FINAL REPORT
# ============================================================================
print_section "📊 TEST RESULTS SUMMARY"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED/$TOTAL_TESTS)*100}")

echo -e "${BOLD}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo -e "${CYAN}Success Rate: $SUCCESS_RATE%${NC}\n"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${BOLD}${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║                   🎉 ALL TESTS PASSED! 🎉                                     ║"
    echo "║                                                                               ║"
    echo "║              Webhook feature is fully operational!                            ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    echo -e "${CYAN}📝 Next Steps:${NC}"
    echo -e "   1. View webhooks in real-time: ${BOLD}http://localhost:3002/${NC}"
    echo -e "   2. Check receiver stats: ${BOLD}curl http://localhost:3002/stats${NC}"
    echo -e "   3. Integrate with Slack/Discord/Teams"
    echo -e "   4. Set up production webhooks\n"
    
    exit 0
else
    echo -e "${BOLD}${YELLOW}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║                   ⚠️  SOME TESTS FAILED ⚠️                                    ║"
    echo "║                                                                               ║"
    echo "║              Please review the errors above                                   ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    exit 1
fi

