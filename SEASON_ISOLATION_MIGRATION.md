# CSC Management - Season Isolation Implementation Plan

## Overview
Implementasi **season-aware** database queries di semua 333 lokasi untuk mencegah cross-season data leakage.

## Architecture
```
┌─ Season-Isolated Data Model
├─ Migration 1: migration_multi_season_architecture.sql (existing)
├─ Migration 2: migration_season_isolation_archive.sql (existing)
├─ Migration 3: migration_enforce_rls_season_isolation.sql (NEW)
├─ Layer: lib/supabase.ts (NEW helpers)
└─ Application: All queries MUST include season_id filter
```

## Implementation Steps

### Step 1: Deploy RLS Enforcement (Database)
**Status:** ✅ Migration file created
**File:** `migration_enforce_rls_season_isolation.sql`
**Action:** Execute in Supabase SQL Editor

What it does:
- Enable RLS on 17 operational tables
- Create policies that prevent reading/writing across seasons
- Create SECURITY DEFINER functions for safe data access

### Step 2: Use Season Query Helpers (Application)
**Status:** ✅ Helpers added to lib/supabase.ts
**Functions available:**
- `getSeasonLogbookEntries(memberId, seasonId, options)`
- `getSeasonPrograms(seasonId)`
- `getSeasonEvents(seasonId)`
- `getSeasonTransactions(seasonId)`
- `getSeasonReimbursements(seasonId, status)`
- `getSeasonAdvocacy(seasonId)`
- `getSeasonContentRequests(seasonId)`

### Step 3: Update Pages (Phase-Based)

#### Phase 1: Critical Pages (High Traffic)
These pages are visited frequently and must be updated first:
- `/dashboard` - Main hub
- `/finance/transactions` - Finance ops
- `/finance/kas` - Cash management
- `/hr/logbook` - HR records
- `/operating/programs` - Program management
- `/members` - Member list (filter active season members)

**Pattern for update:**
```typescript
// BEFORE (wrong - cross-season leak)
const { data } = await supabase
    .from('logbook_entries')
    .select('*')
    .order('created_at', { ascending: false })

// AFTER (correct - season-isolated)
import { getSeasonLogbookEntries } from '@/lib/supabase'
const { currentUser, currentSeason } = useCurrentUser()
const { data } = await getSeasonLogbookEntries(
    currentUser?.id || null,
    currentSeason?.id || null
)
```

#### Phase 2: Secondary Pages (Medium Traffic)
- `/marketing/content`
- `/operating/orders`
- `/finance/reimbursement`
- `/overview/*`
- `/hr/advocacy`
- `/operating/broadcasts`

#### Phase 3: Support Pages (Low Traffic)
- All remaining pages

### Step 4: Test Season-Switching
After updates:
1. Login with test user in Season 2025/2026
2. View logbook, programs, transactions, etc.
3. Create a new test season 2026/2027
4. Switch to new season
5. Verify OLD season data is completely hidden
6. Verify NEW season is empty (fresh slate)

## Current Status

| Component | Status | Evidence |
|-----------|--------|----------|
| Migration SQL | ✅ Done | migration_enforce_rls_season_isolation.sql created |
| Helper Functions | ✅ Done | 7 seasonal helpers in lib/supabase.ts |
| AuthProvider | ✅ OK | Already tracks currentSeason context |
| Dashboard | ⏳ TODO | Needs season_id injection |
| Finance | ⏳ TODO | 12+ queries need update |
| HR | ⏳ TODO | 8+ queries need update |
| Operating | ⏳ TODO | 15+ queries need update |
| Marketing | ⏳ TODO | 5+ queries need update |
| Overview | ⏳ TODO | 10+ queries need update |

## Critical Notes for Mas Daniandra

1. **After RLS Migration**: Queries without season_id filter will STILL WORK (for now) because:
   - RLS policy uses `auth.uid()` which may not be set in client SDK
   - Real enforcement happens client-side via helper functions

2. **Once All Queries Updated**: Can enable STRICT RLS that blocks cross-season queries at database level

3. **Season Switching**: After update, switching season in sidebar = complete data refresh

4. **Archive Behavior**: When season is archived, queries return 0 rows (read-only enforced)

## Next Action
Pak, Pilih:
1. **Execute RLS migration** di Supabase dulu
2. **Start updating pages** Phase 1 satu per satu
3. **Test thoroughly** sebelum production

Atau saya jalankan semuanya automated dengan script?
