import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clujmuvqgffezhmvetqm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbG..._key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * SEASON-AWARE QUERY HELPERS
 * Automatically inject season_id context into all operational queries
 * Prevents cross-season data leakage
 */

export interface QueryContext {
    season_id: string | null | undefined
    user_id?: string
}

/**
 * Helper: Get logbook entries for season
 */
export async function getSeasonLogbookEntries(
    memberId: string | null,
    seasonId: string | null,
    options?: { order_by?: string; ascending?: boolean }
) {
    let query = supabase
        .from('logbook_entries')
        .select('*, member:members(full_name, photo_url)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    if (memberId) {
        query = query.eq('member_id', memberId)
    }
    
    if (options?.order_by) {
        query = query.order(options.order_by, { ascending: options.ascending ?? true })
    }
    
    return query
}

/**
 * Helper: Get programs for season
 */
export async function getSeasonPrograms(seasonId: string | null) {
    let query = supabase
        .from('programs')
        .select('*, kpis:program_kpis(id, target, current)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    return query
}

/**
 * Helper: Get events for season
 */
export async function getSeasonEvents(seasonId: string | null) {
    let query = supabase
        .from('events')
        .select('*, creator:members(full_name)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    return query.order('date', { ascending: false })
}

/**
 * Helper: Get financial transactions for season
 */
export async function getSeasonTransactions(seasonId: string | null) {
    let query = supabase
        .from('financial_transactions')
        .select('*, program:programs(name), member:members(full_name)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    return query.order('transaction_date', { ascending: false })
}

/**
 * Helper: Get reimbursements for season
 */
export async function getSeasonReimbursements(seasonId: string | null, status?: string) {
    let query = supabase
        .from('reimbursements')
        .select('*, member:members(full_name, email), attachments:reimbursement_attachments(*)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    if (status) {
        query = query.eq('status', status)
    }
    
    return query.order('created_at', { ascending: false })
}

/**
 * Helper: Get advocacy/aspirations for season
 */
export async function getSeasonAdvocacy(seasonId: string | null) {
    let query = supabase
        .from('advocacy_aspirations')
        .select('*, member:members(full_name)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    return query.order('created_at', { ascending: false })
}

/**
 * Helper: Get content requests for season
 */
export async function getSeasonContentRequests(seasonId: string | null) {
    let query = supabase
        .from('content_requests')
        .select('*, requester:members(full_name)')
    
    if (seasonId) {
        query = query.eq('season_id', seasonId)
    }
    
    return query.order('created_at', { ascending: false })
}