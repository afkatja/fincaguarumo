#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { program } from 'commander'

program
  .name('set-admin')
  .description('Promote or demote a Supabase user to admin role')
  .requiredOption('-e, --email <email>', 'User email address')
  .requiredOption('-p, --project-ref <ref>', 'Supabase project reference (e.g., abcdefghijklmnop)')
  .requiredOption('-k, --service-key <key>', 'Supabase service role key')
  .option('--demote', 'Remove admin role instead of adding')
  .option('--dry-run', 'Show what would be done without making changes')
  .parse(process.argv)

const options = program.opts()

async function main() {
  const supabaseUrl = `https://${options.projectRef}.supabase.co`
  const supabase = createClient(supabaseUrl, options.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log(`🔍 Looking up user: ${options.email}`)

  // Find user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    process.exit(1)
  }

  const user = users.users.find(u => u.email?.toLowerCase() === options.email.toLowerCase())

  if (!user) {
    console.error(`❌ User not found: ${options.email}`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.id} (${user.email})`)
  console.log(`   Current app_metadata:`, JSON.stringify(user.app_metadata, null, 2))

  const currentRoles = user.app_metadata?.roles || []
  const currentRole = user.app_metadata?.role
  const isAdmin = currentRole === 'admin' || currentRoles.includes('admin')

  if (options.demote) {
    if (!isAdmin) {
      console.log('ℹ️  User is already not an admin')
      return
    }

    const newRoles = currentRoles.filter(r => r !== 'admin')
    const newAppMetadata = {
      ...user.app_metadata,
      role: newRoles.length > 0 ? newRoles[0] : undefined,
      roles: newRoles.length > 0 ? newRoles : undefined,
    }

    console.log(`🔄 Demoting user from admin...`)
    console.log(`   New app_metadata:`, JSON.stringify(newAppMetadata, null, 2))

    if (options.dryRun) {
      console.log('🏃 Dry run - no changes made')
      return
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: newAppMetadata,
    })

    if (error) {
      console.error('❌ Failed to demote user:', error.message)
      process.exit(1)
    }

    console.log('✅ User demoted from admin successfully')
  } else {
    if (isAdmin) {
      console.log('ℹ️  User is already an admin')
      return
    }

    const newRoles = [...new Set([...currentRoles, 'admin'])]
    const newAppMetadata = {
      ...user.app_metadata,
      role: 'admin',
      roles: newRoles,
    }

    console.log(`🔄 Promoting user to admin...`)
    console.log(`   New app_metadata:`, JSON.stringify(newAppMetadata, null, 2))

    if (options.dryRun) {
      console.log('🏃 Dry run - no changes made')
      return
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: newAppMetadata,
    })

    if (error) {
      console.error('❌ Failed to promote user:', error.message)
      process.exit(1)
    }

    console.log('✅ User promoted to admin successfully')
  }

  // Verify the change
  const { data: updatedUser, error: fetchError } = await supabase.auth.admin.getUserById(user.id)

  if (fetchError) {
    console.warn('⚠️  Could not verify change:', fetchError.message)
    return
  }

  console.log(`   Updated app_metadata:`, JSON.stringify(updatedUser.user.app_metadata, null, 2))
}

main().catch(console.error)