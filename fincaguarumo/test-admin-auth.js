// Test script to verify admin authentication implementation
// This script demonstrates how to use the protected availability endpoints

const BASE_URL = "http://localhost:3000"

// Example: How to make an authenticated request to PUT /api/availability
async function testAuthenticatedPut() {
  // First, you need to get a JWT token from Supabase Auth
  // This would typically be done through your login flow

  const adminToken = "your_supabase_jwt_token_here" // Replace with actual token

  const response = await fetch(`${BASE_URL}/api/availability`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      startDate: "2024-12-25",
      endDate: "2024-12-26",
      isAvailable: false,
      reason: "Test admin update",
    }),
  })

  const result = await response.json()

  if (response.ok) {
    console.log("✅ Admin PUT request successful:", result)
  } else {
    console.log("❌ Admin PUT request failed:", result)

    if (response.status === 401) {
      console.log("   Status: Unauthenticated (missing/invalid token)")
    } else if (response.status === 403) {
      console.log("   Status: Unauthorized (user is not admin)")
    } else {
      // Fail script on unexpected status
      throw new Error(
        `Unexpected HTTP status ${response.status} for admin PUT request. Response: ${JSON.stringify(result)}`,
      )
    }
  }
}

// Example: How to make an authenticated request to DELETE /api/availability
async function testAuthenticatedDelete() {
  const adminToken = "your_supabase_jwt_token_here" // Replace with actual token
  const availabilityId = "your_availability_id_here" // Replace with actual ID

  const response = await fetch(
    `${BASE_URL}/api/availability?id=${availabilityId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  )

  const result = await response.json()

  if (response.ok) {
    console.log("✅ Admin DELETE request successful:", result)
  } else {
    console.log("❌ Admin DELETE request failed:", result)

    if (response.status === 401) {
      console.log("   Status: Unauthenticated (missing/invalid token)")
    } else if (response.status === 403) {
      console.log("   Status: Unauthorized (user is not admin)")
    } else if (response.status === 404) {
      console.log("   Status: Not found (availability ID may not exist)")
    } else {
      // Fail script on unexpected status
      throw new Error(
        `Unexpected HTTP status ${response.status} for admin DELETE request. Response: ${JSON.stringify(result)}`,
      )
    }
  }
}

// Example: What happens without authentication
async function testUnauthenticatedRequest() {
  const response = await fetch(`${BASE_URL}/api/availability`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: "2024-12-25",
      endDate: "2024-12-26",
      isAvailable: false,
    }),
  })

  const result = await response.json()

  if (response.status === 401) {
    console.log("✅ Unauthenticated request correctly blocked:", result)
  } else if (response.status === 403) {
    console.log("✅ Unauthenticated request correctly blocked:", result)
  } else {
    // Fail script on unexpected status - should be 401/403
    throw new Error(
      `Unexpected HTTP status ${response.status} for unauthenticated request. Expected 401 or 403, got: ${JSON.stringify(result)}`,
    )
  }
}

// Export functions for testing
module.exports = {
  testAuthenticatedPut,
  testAuthenticatedDelete,
  testUnauthenticatedRequest,
}

console.log(`
🔐 Admin Authentication Implementation Complete!

📋 Summary of changes:
1. Created /src/lib/auth.ts with verifyAdminAuth() function
2. Updated /src/app/api/availability/route.ts to require admin auth for PUT/DELETE
3. Created migration 007_add_admin_users_and_restrict_rls.sql for database setup
4. Both endpoints now return 401 for unauthenticated, 403 for unauthorized

🚀 Next steps:
1. Run the migration in Supabase SQL Editor
2. Create admin users in Supabase Auth
3. Set is_admin = true for admin users in the users table
4. Update your frontend to include JWT tokens in Authorization headers

📝 Usage:
- Include 'Authorization: Bearer <jwt_token>' header in requests
- JWT tokens are obtained from Supabase Auth after user login
- Admin status is checked via user metadata or users table

🧪 Test functions available in this script:
- testAuthenticatedPut() - Test with valid admin token
- testAuthenticatedDelete() - Test DELETE with admin token  
- testUnauthenticatedRequest() - Test without authentication
`)
