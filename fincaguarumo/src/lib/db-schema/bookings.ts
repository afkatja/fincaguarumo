// ============================================================================
// STRICT DATABASE SCHEMA CONTRACT
// This file defines the exact columns that exist in the Supabase bookings table.
// Any changes to the database MUST be reflected here.
// Source of truth: supabase/migrations/
// ============================================================================

/**
 * Columns that exist in the bookings table
 * Based on migrations:
 * - 001_add_booking_columns.sql (base columns + additions)
 * - 014_add_external_reservation_id.sql
 */
export const BOOKINGS_TABLE_COLUMNS = {
  // Primary key
  id: 'uuid',                    // auto-generated
  
  // Core columns (from initial table creation + migration 001)
  uid: 'text',                   // iCal UID, used for upsert conflict resolution
  check_in: 'timestamptz',       // check-in date
  check_out: 'timestamptz',      // check-out date
  guest_name: 'text',            // guest name
  source: 'text',                // 'booking', 'airbnb', 'vrbo', 'direct', 'sanity', etc.
  booking_type: 'text',          // 'villa', etc. (default: 'villa')
  currency: 'text',              // 'usd', 'eur', etc. (default: 'usd')
  guests: 'integer',             // number of guests (default: 1)
  total_price: 'numeric(10,2)',  // price in cents (nullable)
  
  // Migration 001 additions
  email: 'text',                 // guest email (nullable)
  phone: 'text',                 // guest phone (nullable)
  summary: 'text',               // booking summary (nullable)
  description: 'text',           // booking description (nullable)
  synced_at: 'timestamptz',      // last sync timestamp (nullable)
  
  // Migration 014 addition
  external_reservation_id: 'text', // External platform reservation ID (nullable)
  
  // NOT in bookings table (only in availability table):
  // created_at, updated_at
} as const

/**
 * Type derived from the schema above
 */
export type BookingsTableRow = {
  id: string
  uid: string
  check_in: string
  check_out: string
  guest_name: string
  source: string
  booking_type: string
  currency: string
  guests: number
  total_price: number | null
  email: string | null
  phone: string | null
  summary: string | null
  description: string | null
  synced_at: string | null
  external_reservation_id: string | null
}

/**
 * Columns safe to select for admin API (non-PII)
 */
export const BOOKINGS_ADMIN_SELECT_COLUMNS = [
  'id',
  'uid',
  'check_in',
  'check_out',
  'guest_name',
  'source',
  'booking_type',
  'currency',
  'guests',
  'total_price',
  'external_reservation_id',
  'synced_at',
] as const

/**
 * Columns safe to select for public/user API (excludes sensitive data)
 */
export const BOOKINGS_PUBLIC_SELECT_COLUMNS = [
  'id',
  'uid',
  'check_in',
  'check_out',
  'guests',
  'booking_type',
  'total_price',
  'currency',
  'source',
  'external_reservation_id',
] as const

/**
 * Columns required for upsert (iCal sync)
 */
export const BOOKINGS_UPSERT_COLUMNS = [
  'uid',
  'check_in',
  'check_out',
  'guest_name',
  'source',
  'booking_type',
  'currency',
  'guests',
  'total_price',
] as const
