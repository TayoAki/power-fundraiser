# Power Fundraiser Database Migrations

## Overview

These migrations set up the complete database schema for the Power Fundraiser donor management system using **Supabase** (PostgreSQL).

## Migration Files

| File | Description |
|------|-------------|
| `00001_create_base_tables.sql` | Core tables: organizations, users, donors, campaigns, contacts, activities, etc. |
| `00002_rls_policies.sql` | Row Level Security policies for multi-tenant data isolation |
| `00003_functions_triggers.sql` | Helper functions, triggers, and stored procedures |
| `00004_views_indexes.sql` | Useful views and performance indexes |
| `00005_seed_templates.sql` | System email templates and view permissions |

## Running Migrations

### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Manual Execution

Run the migration files in order via the Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Execute each file in numerical order

## Schema Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  organizations  │────<│  user_profiles  │     │     donors      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               │
┌─────────────────┐                                     │
│    campaigns    │                                     │
└─────────────────┘                                     │
        │                                               │
        │              ┌─────────────────┐              │
        └─────────────>│ campaign_donors │<─────────────┘
                       └─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   activities    │   │     notes       │   │     tasks       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
        │
        │
        ▼
┌─────────────────┐
│    contacts     │
└─────────────────┘
```

## Key Tables

### `donors`
Stores foundation/corporate/individual donor data from 990-PF filings and AI enrichment.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `name` | Donor/foundation name |
| `category` | Foundation, Corporate, Individual, Government, Other |
| `tier` | LOCAL, REGIONAL, NATIONAL, INTERNATIONAL |
| `total_assets` | From 990-PF data |
| `focus_areas` | Comma-separated focus areas |
| `ai_insights` | JSONB with AI-generated analysis |
| `officers` | JSONB array of key people |

### `campaigns`
Fundraising campaigns created by organizations.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `organization_id` | FK to organizations |
| `name` | Campaign name |
| `target_amount` | Fundraising goal |
| `cause_areas` | Array of focus areas |
| `search_config` | JSONB with AI search parameters |

### `campaign_donors`
Junction table linking donors to campaigns with pipeline tracking.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `campaign_id` | FK to campaigns |
| `donor_id` | FK to donors |
| `stage` | Pipeline stage (research → funded) |
| `alignment_score` | AI-calculated match score (0-100) |
| `health_score` | Relationship health (0-100) |
| `ask_amount` | Target donation amount |

### `contacts`
People at donor organizations.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `donor_id` | FK to donors |
| `name` | Contact name |
| `title` | Job title |
| `role` | Champion, Key Voter, etc. |
| `connection_degree` | 1st, 2nd, 3rd, none |

### `activities`
Unified activity log for all interactions.

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `type` | email_sent, call, meeting, etc. |
| `campaign_donor_id` | FK to campaign_donors |
| `contact_id` | FK to contacts |
| `sentiment` | positive, neutral, negative |

## Key Functions

| Function | Description |
|----------|-------------|
| `search_donors(...)` | Full-text search with filters |
| `add_donor_to_campaign(...)` | Add donor with conflict handling |
| `move_donor_to_stage(...)` | Pipeline stage transitions |
| `log_activity(...)` | Create activity with auto-linking |
| `get_pipeline_summary(...)` | Aggregate pipeline stats |
| `calculate_health_score(...)` | Dynamic health calculation |

## Row Level Security

All tables use RLS to ensure data isolation:

- **Organizations**: Users only see their own org
- **Campaigns**: Scoped to user's organization
- **Donors**: Shared read access (public 990-PF data)
- **Campaign Donors**: Via campaign → organization chain
- **Contacts/Activities/Notes/Tasks**: Via organization_id

## Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next Steps

After running migrations:

1. Create a Supabase client in your Next.js app
2. Update localStorage-based state to use Supabase queries
3. Implement authentication with Supabase Auth
4. Set up realtime subscriptions for live updates
