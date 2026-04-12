#!/bin/bash

# Test Supabase booking flow using npx supabase
# This script tests the exact flow from the webhook starting at line 169

echo "🧪 Testing Supabase booking flow with npx supabase..."

# Check if Supabase is running
echo "📋 Checking Supabase status..."
npx supabase status || {
  echo "❌ Supabase is not running. Start it with: npx supabase start"
  exit 1
}

# Run the test script
echo "🚀 Running the test script..."
npx ts-node test-supabase-flow-fixed.ts

echo "✅ Test completed!"
