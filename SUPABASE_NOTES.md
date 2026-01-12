# Supabase Donor Insert - Progress Notes

## Current Issue (Jan 12, 2026)

### Error Log Analysis

```
❌ [Supabase] Error inserting donors: 
{
  code: "PGRST204",
  message: "Could not find the 'fiscal_year_end' column of 'donors' in the schema cache"
}
```

### Root Cause
The **migration file** (`00001_create_base_tables.sql`) defines these columns:
- `fiscal_year_end` (line 67)
- `principal_officer` (line 77)
- `officers` JSONB (line 78)
- `grants` JSONB (line 81)

**BUT** the actual Supabase database does NOT have these columns applied.
The migration was written but never executed on the live database.

### Columns That EXIST in Live DB (confirmed working)
- `name`
- `category`
- `city`
- `state`
- `website`
- `focus_areas`
- `total_assets`
- `total_giving`
- `description`
- `ein`

### Columns That DO NOT EXIST in Live DB (causing errors)
- `fiscal_year_end`
- `principal_officer`
- `officers`
- `grants`

---

## Fix Options

### Option A: Update Code (Quick Fix)
Remove non-existent columns from `saveAIDonorResults()` in `src/lib/supabase.js`

### Option B: Apply Migration (Better Long-term)
Run this SQL in Supabase SQL Editor:
```sql
ALTER TABLE donors ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(20);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS principal_officer VARCHAR(255);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS officers JSONB DEFAULT '[]';
ALTER TABLE donors ADD COLUMN IF NOT EXISTS grants JSONB DEFAULT '[]';
```

---

## Other Warnings (Non-blocking)

```
⚠️ [Supabase] Campaign ID is not a valid UUID, skipping campaign link: campaign-1768241846753
```

**Cause:** Campaigns created in localStorage use timestamp-based IDs, not UUIDs.
**Status:** Working as designed - donors save, just not linked to campaign.
**Future Fix:** Create campaigns in Supabase first, use UUID from DB.

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/lib/supabase.js` | `saveAIDonorResults()` function |
| `supabase/migrations/00001_create_base_tables.sql` | Schema definition |

---

## Last Updated
- Jan 12, 2026 - Created notes, identified schema mismatch
