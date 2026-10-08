import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function makeAdmin(email: string) {
  try {
    console.log(`Looking up user with email: ${email}`)

    // Get all users from auth.users with pagination
    const allUsers = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    while (hasMore) {
      const {
        data: { users },
        error: authError,
      } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

      if (authError) {
        console.error("Error fetching users from auth:", authError)
        process.exit(1)
      }

      allUsers.push(...users)
      hasMore = users.length === perPage
      page++
    }

    const user = allUsers.find(u => u.email === email)

    if (!user) {
      console.error(`User with email ${email} not found in auth.users`)
      console.log("Make sure the user has confirmed their email address")
      process.exit(1)
    }

    console.log(`Found user with ID: ${user.id}`)

    // Check if user already exists in public.users
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking existing user:", selectError)
      process.exit(1)
    }

    if (existingUser) {
      console.log("User already exists in public.users table")

      // Update is_admin to true
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ is_admin: true })
        .eq("id", user.id)

      if (updateError) {
        console.error("Error updating user to admin:", updateError)
        process.exit(1)
      }

      console.log("✅ User has been marked as admin")
    } else {
      console.log("User not found in public.users table, creating...")

      // Insert user with is_admin = true
      const { error: insertError } = await supabaseAdmin.from("users").insert({
        id: user.id,
        email: user.email,
        is_admin: true,
      })

      if (insertError) {
        console.error("Error inserting user:", insertError)
        process.exit(1)
      }

      console.log("✅ User has been added to public.users and marked as admin")
    }

    console.log("\nYou can now log in with this email address at /admin/login")
  } catch (error) {
    console.error("Unexpected error:", error)
    process.exit(1)
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.log("Usage: npx tsx scripts/make-admin.ts <email>")
  console.log("Example: npx tsx scripts/make-admin.ts afkatja@gmail.com")
  process.exit(1)
}

makeAdmin(email)
