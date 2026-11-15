#!/usr/bin/env python3
"""
CSC Management - Automated Season Isolation Query Update
Phase 1: Update critical pages (dashboard, finance, HR)
"""

import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent

# Map of old query patterns to replacement with season context
QUERY_PATTERNS = {
    # Financial Transactions
    (
        r"const\s+{\s*data\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]financial_transactions['\"]\s*\)\s*\.\s*select\(\s*['\"].*?['\"]\s*\)",
        "getSeasonTransactions",
        "import { getSeasonTransactions } from '@/lib/supabase'"
    ): (
        """const currentUser = useCurrentUser()
        const { data } = await getSeasonTransactions(currentUser?.season_id)"""
    ),
    
    # Programs
    (
        r"const\s+{\s*data:\s*p\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]programs['\"]\s*\)",
        "getSeasonPrograms",
        "import { getSeasonPrograms } from '@/lib/supabase'"
    ): (
        """const currentUser = useCurrentUser()
        const { data: p } = await getSeasonPrograms(currentUser?.season_id)"""
    ),
    
    # Logbook Entries
    (
        r"const\s+{\s*data\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]logbook_entries['\"]\s*\)",
        "getSeasonLogbookEntries",
        "import { getSeasonLogbookEntries } from '@/lib/supabase'"
    ): (
        """const currentUser = useCurrentUser()
        const { data } = await getSeasonLogbookEntries(null, currentUser?.season_id)"""
    ),
}

def update_file_with_season_context(filepath: str) -> bool:
    """Update a single file to add season context to queries"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Already updated?
        if 'currentSeason?.id' in content or 'currentUser?.season_id' in content:
            return False
        
        # Add useCurrentUser import if missing
        if 'useCurrentUser' not in content and '@/lib/auth' not in content:
            if "import { useState" in content:
                content = content.replace(
                    "import { useState",
                    "import { useCurrentUser } from '@/lib/auth'\nimport { useState"
                )
        
        # Add season helpers imports
        if 'getSeasonTransactions' in content or 'getSeasonPrograms' in content:
            if '@/lib/supabase' not in content or 'getSeasonTransactions' not in content:
                insert_pos = content.find("import { supabase }")
                if insert_pos > 0:
                    end_line = content.find('\n', insert_pos) + 1
                    new_import = "import { getSeasonTransactions, getSeasonPrograms, getSeasonLogbookEntries, getSeasonEvents, getSeasonReimbursements, getSeasonAdvocacy, getSeasonContentRequests } from '@/lib/supabase'\n"
                    content = content[:end_line] + new_import + content[end_line:]
        
        # Replace financial_transactions queries
        if '.from(\'financial_transactions\')' in content or '.from("financial_transactions")' in content:
            content = re.sub(
                r"const\s+{\s*data\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]financial_transactions['\"]\s*\)\s*\.\s*select\([^)]*\)\s*\.\s*order\([^)]*\)",
                "const currentUser = useCurrentUser()\n        const { data } = await getSeasonTransactions(currentUser?.season_id)",
                content
            )
        
        # Replace programs queries
        if '.from(\'programs\')' in content:
            content = re.sub(
                r"const\s+{\s*data:\s*p\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]programs['\"]\s*\)\s*\.\s*select\([^)]*\)",
                "const currentUser = useCurrentUser()\n        const { data: p } = await getSeasonPrograms(currentUser?.season_id)",
                content
            )
        
        # Replace logbook queries
        if '.from(\'logbook_entries\')' in content:
            content = re.sub(
                r"const\s+{\s*data\s*}\s*=\s*await\s+supabase\s*\.\s*from\(\s*['\"]logbook_entries['\"]\s*\)\s*\.\s*select\([^)]*\)",
                "const currentUser = useCurrentUser()\n        const { data } = await getSeasonLogbookEntries(null, currentUser?.season_id)",
                content
            )
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error updating {filepath}: {e}")
        return False

def main():
    """Scan and update Phase 1 critical pages"""
    
    critical_pages = [
        'csc-management-website/app/(dashboard)/finance/transactions/page.tsx',
        'csc-management-website/app/(dashboard)/finance/kas/page.tsx',
        'csc-management-website/app/(dashboard)/finance/reimbursement/page.tsx',
        'csc-management-website/app/(dashboard)/overview/logbook/page.tsx',
        'csc-management-website/app/(dashboard)/hr/logbook/page.tsx',
        'csc-management-website/app/(dashboard)/operating/programs/page.tsx',
    ]
    
    updated_count = 0
    for page in critical_pages:
        filepath = PROJECT_ROOT / page
        if filepath.exists():
            if update_file_with_season_context(str(filepath)):
                print(f"✓ Updated: {page}")
                updated_count += 1
            else:
                print(f"⊘ Already updated: {page}")
        else:
            print(f"✗ File not found: {page}")
    
    print(f"\n✓ Phase 1 update complete: {updated_count} files modified")

if __name__ == '__main__':
    main()
