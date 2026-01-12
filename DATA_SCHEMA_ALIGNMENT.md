# Data Schema Alignment Document

## Overview
This document tracks the data flow from Modal API → Supabase → UI for donor search.

---

## 1. MODAL API RESPONSE SCHEMA

**Source:** `https://tayo--unified-donor-discovery-api-discover.modal.run`
**File:** `src/app/api/ai/donor-search/route.js`

### Response Structure
```json
{
  "success": true,
  "donors": [...],
  "count": 50,
  "searchParams": {...},
  "elapsed_seconds": 109
}
```

### Donor Object from Modal API
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `id` | string | "uuid-..." | Unique identifier |
| `name` | string | "Gates Foundation" | Foundation name |
| `category` | string | "Foundation" | Donor type |
| `location` | string | "Seattle, WA" | City, State combined |
| `website` | string | "https://..." | Foundation website |
| `focus_areas` | string | "Education, Health" | Comma-separated |
| `total_assets` | number | 50000000000 | Total assets in dollars |
| `annual_giving` | number | 5000000000 | Annual giving amount |
| `alignment_score` | number | 92 | AI-calculated match (0-100) |
| `description` | string | "Description..." | Foundation description |
| `ein` | string | "91-1663695" | IRS EIN number |
| `fiscal_year_end` | string | "12/31" | Fiscal year end date |
| `principal_officer` | string | "Bill Gates" | Main officer name |
| `officers` | array | [{name, title, compensation}] | Key people |
| `recent_grants` | array | [{recipient_name, amount}] | Grant history |
| `funding_range` | string | "$100K - $1M" | Typical grant size |
| `source` | string | "990-pf" / "grants.gov" | Data source |
| `status` | string | "Research" | Pipeline status |

---

## 2. SUPABASE DATABASE SCHEMA

**File:** `supabase/migrations/00001_create_base_tables.sql`

### `donors` Table - MIGRATION FILE (intended schema)
| Column | Type | Status |
|--------|------|--------|
| `id` | UUID | ✅ Exists |
| `name` | VARCHAR(500) | ✅ Exists |
| `category` | donor_category | ✅ Exists |
| `tier` | donor_tier | ✅ Exists |
| `ein` | VARCHAR(20) | ✅ Exists |
| `website` | VARCHAR(500) | ✅ Exists |
| `description` | TEXT | ✅ Exists |
| `city` | VARCHAR(255) | ✅ Exists |
| `state` | VARCHAR(100) | ✅ Exists |
| `country` | VARCHAR(100) | ✅ Exists |
| `total_assets` | BIGINT | ✅ Exists |
| `total_revenue` | BIGINT | ✅ Exists |
| `total_giving` | BIGINT | ✅ Exists |
| `fiscal_year_end` | VARCHAR(20) | ❌ NOT IN LIVE DB |
| `form_type` | VARCHAR(50) | ❌ NOT IN LIVE DB |
| `giving_range_min` | INTEGER | ❌ NOT IN LIVE DB |
| `giving_range_max` | INTEGER | ❌ NOT IN LIVE DB |
| `funding_range` | VARCHAR(100) | ❌ NOT IN LIVE DB |
| `focus_areas` | TEXT | ✅ Exists |
| `principal_officer` | VARCHAR(255) | ❌ NOT IN LIVE DB |
| `officers` | JSONB | ❌ NOT IN LIVE DB |
| `grants` | JSONB | ❌ NOT IN LIVE DB |
| `ai_insights` | JSONB | ❌ NOT IN LIVE DB |

### `donors` Table - LIVE DB (what actually exists)
**File:** `src/lib/supabase.js` line 717-728

| Column | Type | Mapped From API |
|--------|------|-----------------|
| `name` | VARCHAR | `donor.name` |
| `category` | ENUM | `donor.category` (mapped) |
| `city` | VARCHAR | `donor.location.split(',')[0]` |
| `state` | VARCHAR | `donor.location.split(',')[1]` |
| `website` | VARCHAR | `donor.website` |
| `focus_areas` | TEXT | `donor.focus_areas` |
| `total_assets` | BIGINT | `donor.total_assets` |
| `total_giving` | BIGINT | `donor.annual_giving` |
| `description` | TEXT | `donor.description` |
| `ein` | VARCHAR | `donor.ein` |

---

## 3. UI DATA BINDINGS

**File:** `src/app/dashboard/research/page.js`

### DonorCard Component - Data Usage
| UI Element | Code | API Field Used |
|------------|------|----------------|
| **Name** | `donor.name` | ✅ `name` |
| **Location** | `donor.location` | ✅ `location` |
| **Focus Tags** | `donor.focus_areas.split(',')` | ✅ `focus_areas` |
| **Category** | `donor.category` | ✅ `category` |
| **Alignment Score** | `donor.alignment_score` | ✅ `alignment_score` |
| **Description** | `donor.description` | ✅ `description` |
| **Total Assets** | `donor.total_assets` | ✅ `total_assets` |
| **Annual Giving** | `donor.annual_giving` | ✅ `annual_giving` |
| **Avg Grant** | `donor.recent_grants` (calculated) | ✅ `recent_grants` |
| **Key People** | `donor.officers` | ✅ `officers` |
| **Officer Name** | `officer.name` | ✅ `officers[].name` |
| **Officer Title** | `officer.title` | ✅ `officers[].title` |
| **Officer Comp** | `officer.compensation` | ✅ `officers[].compensation` |
| **Funding Range** | `donor.funding_range` | ✅ `funding_range` |

---

## 4. ALIGNMENT ANALYSIS

### ✅ ALIGNED (Working)
| Data Flow | Status |
|-----------|--------|
| Modal API → React State → UI | ✅ Perfect - All fields display correctly |
| Modal API `name` → UI `donor.name` | ✅ |
| Modal API `location` → UI `donor.location` | ✅ |
| Modal API `officers` → UI Key People tab | ✅ |
| Modal API `recent_grants` → UI Avg Grant calc | ✅ |
| Modal API `annual_giving` → UI Annual Giving | ✅ |
| Modal API `total_assets` → UI Total Assets | ✅ |

### ⚠️ MISALIGNED (Data Loss on DB Save)
| API Field | Supabase Column | Issue |
|-----------|-----------------|-------|
| `fiscal_year_end` | ❌ Missing | Not saved to DB |
| `principal_officer` | ❌ Missing | Not saved to DB |
| `officers` | ❌ Missing | Not saved to DB |
| `grants` / `recent_grants` | ❌ Missing | Not saved to DB |
| `funding_range` | ❌ Missing | Not saved to DB |
| `alignment_score` | Goes to `campaign_donors` | Different table |
| `annual_giving` | `total_giving` | Name mismatch but works |
| `location` | Split to `city`/`state` | Transformed |

### ❌ NOT ALIGNED (Blocking Issues)
None - UI works because it reads from React state, not Supabase.

---

## 5. RECOMMENDATIONS

### Option A: Apply Missing Columns to Live DB
Run this SQL in Supabase:
```sql
ALTER TABLE donors ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(20);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS principal_officer VARCHAR(255);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS officers JSONB DEFAULT '[]';
ALTER TABLE donors ADD COLUMN IF NOT EXISTS grants JSONB DEFAULT '[]';
ALTER TABLE donors ADD COLUMN IF NOT EXISTS funding_range VARCHAR(100);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}';
```

### Option B: Keep Current State
- UI works perfectly from React state
- Supabase only stores basic donor info
- 990-PF details (officers, grants) not persisted

---

## Last Updated
- **Date:** Jan 12, 2026
- **Status:** UI fully functional, Supabase missing columns for full persistence
