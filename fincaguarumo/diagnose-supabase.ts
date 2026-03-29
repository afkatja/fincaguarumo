#!/usr/bin/env node

/**
 * Diagnostic script for Supabase booking flow
 * This will help identify why the booking insert is failing
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env file
config({ path: '.env' })

async function diagnoseSupabaseConnection() {
  console.log('🔍 Starting Supabase diagnostics...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('📋 Environment variables:')
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`)

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('\n🔗 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabaseAdmin.from('bookings').select('count').limit(1)
    console.log('📊 Basic connection test:', { data, error })
    
    if (error) {
      console.error('❌ Connection failed:', error)
      return
    }
    
    console.log('✅ Supabase connection successful')
  } catch (err) {
    console.error('❌ Connection error:', err)
    return
  }

  console.log('\n📋 Checking table structure...')
  
  // Check bookings table structure
  try {
    const { data: columns, error: columnError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'bookings' })
    
    if (columnError) {
      console.log('⚠️  Cannot get table columns via RPC, trying alternative...')
      
      // Alternative: Try to describe the table
      const { data: sampleData, error: sampleError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('❌ Cannot access bookings table:', sampleError)
      } else {
        console.log('✅ Bookings table accessible, sample data:', sampleData)
      }
    } else {
      console.log('✅ Bookings table columns:', columns)
    }
  } catch (err) {
    console.error('❌ Error checking table structure:', err)
  }

  console.log('\n🧪 Testing insert with minimal data...')
  
  // Test insert with minimal required fields
  const minimalBooking = {
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    guest_name: 'Test Minimal',
    source: 'test',
    uid: 'test_minimal_' + Date.now(),
  }

  console.log('📝 Attempting minimal insert:', minimalBooking)

  try {
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert(minimalBooking)
      .select() // Add .select() to return inserted data
    
    console.log('📊 Minimal insert result:', { insertData, insertError })
    
    if (insertError) {
      console.error('❌ Minimal insert failed:', insertError)
      
      // Check if it's a constraint violation
      if (insertError.code === '23505') {
        console.log('💡 This might be a unique constraint violation on the uid field')
      }
      
      // Check if it's a NOT NULL violation
      if (insertError.code === '23502') {
        console.log('💡 This might be a NOT NULL constraint violation')
        console.log('💡 Missing required field:', insertError.details)
      }
      
      // Check if it's a foreign key violation
      if (insertError.code === '23503') {
        console.log('💡 This might be a foreign key constraint violation')
      }
    } else {
      console.log('✅ Minimal insert successful!')
      
      // Clean up
      const { error: deleteError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('uid', minimalBooking.uid)
      
      if (deleteError) {
        console.error('❌ Failed to cleanup test data:', deleteError)
      } else {
        console.log('✅ Test data cleaned up')
      }
    }
  } catch (err) {
    console.error('❌ Error during minimal insert:', err)
  }

  console.log('\n🧪 Testing insert with full webhook data...')
  
  // Test with the exact same data as the webhook
  const fullBooking = {
    check_in: '2024-12-15T00:00:00.000Z',
    check_out: '2024-12-18T00:00:00.000Z',
    guest_name: 'Test Customer',
    email: 'test@example.com',
    phone: '+1234567890',
    source: 'direct',
    uid: 'test_full_' + Date.now(),
    guests: 2,
    booking_type: 'villa',
    total_price: 900,
    currency: 'usd',
  }

  console.log('📝 Attempting full insert:', fullBooking)

  try {
    const { data: fullInsertData, error: fullInsertError } = await supabaseAdmin
      .from('bookings')
      .insert(fullBooking)
      .select() // Add .select() to return inserted data
    
    console.log('📊 Full insert result:', { fullInsertData, fullInsertError })
    
    if (fullInsertError) {
      console.error('❌ Full insert failed:', fullInsertError)
    } else {
      console.log('✅ Full insert successful!')
      
      // Clean up
      const { error: deleteError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('uid', fullBooking.uid)
      
      if (deleteError) {
        console.error('❌ Failed to cleanup test data:', deleteError)
      } else {
        console.log('✅ Test data cleaned up')
      }
    }
  } catch (err) {
    console.error('❌ Error during full insert:', err)
  }

  console.log('\n🏁 Diagnostics completed!')
}

// Run the diagnostics
diagnoseSupabaseConnection().catch(console.error)
